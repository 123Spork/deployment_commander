# deployment_commander
A deployment template system for frontend based projects. Used to generate HTTP web servers, start build processes through bash and deploy through ssh to wherever the project is hosted.

How to use:

1. Install NodeJs.
2. cd to your project directory and npm install dependencies
3. node server.js in root user mode.
4. Load up 127.0.0.1:8088, which is now available.
5. Configure client.js settings and add new project elements to index.html where required.

Build system currently relies on a build_all.sh file being available within the root source folder of your project. It provides the variable BUILD_VERSION, which you can utilise in your build process. If you don't provide a version number, one is generated procedurally from the current epoch. You can mix and match development and live project structures if you need to, the example in the git repo demonstrating this.
