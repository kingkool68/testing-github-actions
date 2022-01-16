# Simple Deployment via SSH

When a new change is pushed to the repo:
 - Download dependencies (with caching)
 - Compile CSS and JavaScript (via npm commands)
 - Commit compiled version to a build-specific branch (Example: `master` branch gets built and commited to  the `master-build` branch)
 - SSH into a server to run a command for deployment

## How does it work?
When the GitHub action is run we run commands to compile a "built" version of the codebase. The "built" version gets commited to a build specific branch. Example: `master` branch gets built and commited to  the `master-build` branch. Deploying to a server can be done via a `git pull` to bring down the latest changes.

## Secrets

The following secrets need to be [set in your repository](settings/secrets/actions) for this GitHub action to work.

 - `SSH_HOST` - The address the action should connect to via SSH to run a command to deploy the changes.
 - `SSH_USER` - The username to use for the SSH connection. Example: `ssh user@hostname`.
 - `SSH_PRIVATE_KEY` - The private key for the SSH connection.
## Creating a Deployment Specific User
When deploying code automatically from server to server its a good idea to use a dedicated system user on the remote server that is locked down in what they can do. If the SSH private key is compromised we want to be sure the deployment user can only perform limited commands so the connecting server isn't compromised. This can be achieved by specifying a command to run using the `authorized_keys` file when the user connects. See [Restrict a User to SSH Forced Command](https://ctrlnotes.com/restrict-a-user-to-ssh-forced-command/#).

 - [Generate a new SSH keypair](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
 - Copy the private key (`id_rsa`) contents to the `SSH_PRIVATE_KEY` secret for your repository
 - Copy the public key (`id_rsa.pub`) to your server you want to deploy to
 - On the server you want to deploy to edit or create a file called `authorized_keys` usually located in `~.ssh/authorized_keys` or `.openssh/authorized_keys`
  - Add a new line in the format `<command> <ssh public key> <comment>`. Example: `command="date" ssh-rsa <the public ssh key for the user you want to restrict> deployment-user`
  - Whenever a user connects to the server with the private key that matches the specified public key, a command will be run and the connection will then be closed.
  - You can run a script with a command like `command="/path/to/script.sh"`.
  - Make sure your script can be executed like `chmod +x script.sh`.

## Deployment Script
Since we have a build branch we can deploy the changes to the server by running a force git pull like so:

```
cd ~/path/to/the/root/directory/of/the/site

# Force git pull
git fetch --all
git reset --hard origin/<branch name>
```

If you ever need to rollback changes by one commit you can run `git reset --hard HEAD~1`.
