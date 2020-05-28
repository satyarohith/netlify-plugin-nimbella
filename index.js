const {appendFile} = require('fs').promises;
const {join} = require('path');

const nim = `npx -p https://apigcp.nimbella.io/downloads/nim/nimbella-cli.tgz nim`;

module.exports = {
  onPreBuild: async ({constants, utils, inputs}) => {
    // Login
    if (process.env.NETLIFY) {
      await utils.run.command(
        `${nim} auth login ${process.env.NIM_TOKEN || inputs.nimbellaToken}`
      );
    }
  },
  onPostBuild: async ({constants, utils, inputs}) => {
    // Redirect api calls
    const {stdout} = await utils.run.command(`${nim} auth current`);
    const namespace = stdout.trim();
    const redirectRule = `/api/* https://apigcp.nimbella.io/api/v1/web/${namespace}/default/:splat 200!\n`;
    await appendFile(join(constants.PUBLISH_DIR, '_redirects'), redirectRule);

    const {readdir} = require('fs').promises;
    const files = await readdir(constants.FUNCTIONS_SRC);

    for (const file of files) {
      // Deploy
      console.log(`Deploying ${file}...`);
      let {stderr, exitCode} = await utils.run.command(
        `${nim} action update ${file.split('.')[0]} ${join(
          constants.FUNCTIONS_SRC,
          file
        )} --kind nodejs-lambda:10 --main handler --web=true`,
        {reject: false, stdout: 'ignore'}
      );

      if (exitCode === 0) {
        console.log('done.');
      } else {
        console.log(stdout || stderr);
      }
    }
  }
};
