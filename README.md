# Simple Deployment via SSH

When a new change is pushed to the repo, we SSH into a server and run a Git command to pull down the latest changes.

## How does it work?
When a commit is pushed up to the repo we run a GitHub action to maybe make a deployment. The deployment consists of connecting to a remote server via SSH and running a few commands to pull down the changes from the repo to the server. This use case assumes the root of your repo is the root of your website.

The `if: github.ref == 'refs/heads/master' || github.ref == 'refs/heads/staging'` line lets us determine what branches should trigger a deploy. We can also do different deployment commands depending on the branch using different steps with conditionals.

## What other dependencies does this use?
 and the [GitHub Slug](https://github.com/rlespinasse/github-slug-action) action.

This action relies on the [SSH for GitHub Actions](https://github.com/marketplace/actions/ssh-remote-commands) action to handle the details of making an SSH connection to one or more remote servers and running a command.

Because GitHub doesn't directly expose the name of the branch that triggered the action we need the [GitHub Slug](https://github.com/rlespinasse/github-slug-action) action. `${{ github.ref }}` will expose something like `refs/heads/master` which we can't use directly to switch to a particular branch. See the [Github context](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/contexts-and-expression-syntax-for-github-actions#github-context) documentation.

## Secrets

There are certain pieces of information we don't want visible to everyone with the repo. To hide this info we can encrpyt them and refer to them as secrets from within our Github action. To add secrets, go to the secrets section of the repo settings. See https://github.com/<Github User Name>/<Repo Name>/settings/secrets

The `key` argument is the private SSH key used to connect to the remote server. You would want to generate an SSH key pair on your remote server under the desired user account. SSH from this GitHub action will use the private key to authenticate with the public key stored on the server. You don't want your private key publically exposed to prevent it from being compromised. `${{ secrets.SSH_PRIVATE_KEY }}` is the name of the secret that holds the private SSH key.

The `host` argument is the address we should make an SSH connection to (Examples `123.456.789.000` or `example.com`.) `${{ secrets.SSH_HOST }}` is the name of the secret that holds the address to connect to.

The `user` argument can be an encrypted secret or not depending on your comfort level.

## How does the `script` argument work?

Once an SSH connection is sucessfully made commands specified in the `script` argument are run.

 - `cd /var/www/test.russellheimlich.com/htdocs` changes to the root directory of the website
 - `git checkout ${{ env.GITHUB_REF_SLUG }}` switches the branch to the one that trigged the GitHub action
 - `git fetch` downloads the latest changes from the remote origin
 - `git reset --hard origin/${{ env.GITHUB_REF_SLUG }}` is equivalent to doing a force pull which overwrites any local changes. See https://stackoverflow.com/questions/1125968/how-do-i-force-git-pull-to-overwrite-local-files


## How can we deploy to different enviornments?
Using different steps with conditionals we can configure different commands for deploying different environments. An example GitHub action YAML file might look like this:

```
name: Deploy to different environments
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: rlespinasse/github-slug-action@master

      - name: SSH into the production server and update the repo
        if: github.ref == 'refs/heads/master'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_PROD_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PROD_PRIVATE_KEY }}
          script: |
            cd /path/to/prod/website/
            git checkout ${{ env.GITHUB_REF_SLUG }}
            git fetch
            git reset --hard origin/${{ env.GITHUB_REF_SLUG }}

      - name: SSH into the staging server and update the repo
        if: github.ref == 'refs/heads/staging'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_STAGING_HOST }}
          username: deploy
          key: ${{ secrets.SSH_STAGING_PRIVATE_KEY }}
          script: |
            cd /path/to/staging/website/
            git checkout ${{ env.GITHUB_REF_SLUG }}
            git fetch
            git reset --hard origin/${{ env.GITHUB_REF_SLUG }}
```

## Creating a Deployment Specific User
When deploying code automatically from server to server its a good idea to use a dedicated system user on the remote server that is fairly locked down in what they can do. I followed along with this guide for creating a `deploy` user https://mikeeverhart.net/2016/02/add-a-deploy-user-to-a-remote-linux-server/

The one tweak I would make is I would add `sudo usermod -g www-data deploy` so the `deploy` user's primary group is `www-data`, the same group the web server uses to read the files. This means when you deploy changes to your server they will be added to the same group as the web server user that reads the files. This also means you need to change permissions from the reccomended `755` to `775` for directories and from `644` to `664` for files. `775` allows the directory owner and users in the same group as the directory owner to read, write, and execute while others can only read and execute. See https://chmodcommand.com/chmod-775/ `664` allows read and write permissions for the file owner and the users in the same group as the file owner while others can only read the file. See https://chmodcommand.com/chmod-664/

Here's a small script to recursivly set the permissions correctly:

```
# Set all directories permissions to 775
find . -type d -exec chmod 775 {} \;

# Set all files permissions to 664
find . -type f -exec chmod 664 {} \;
```
