# Push this project to GitHub from Windows Terminal

## Option 1: Git commands only

Open Windows Terminal or PowerShell in the project folder, then run:

```powershell
git init
git branch -M main
git add .
git commit -m "Build local professional speak converter"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace:

```text
YOUR_USERNAME
YOUR_REPO_NAME
```

with your actual GitHub username and repository name.

## Option 2: If you already have GitHub CLI installed

```powershell
gh auth login
gh repo create icanspeakprofessionally --public --source=. --remote=origin --push
```

For a private repository:

```powershell
gh repo create icanspeakprofessionally --private --source=. --remote=origin --push
```

## Option 3: Use the included PowerShell helper

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\push-to-github.ps1 -RepoUrl "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
```

## If Git says remote origin already exists

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## If Git asks you to log in

Use one of these:

- Sign in through the browser prompt from Git Credential Manager.
- Use GitHub CLI with `gh auth login`.
- Use a GitHub personal access token when asked for a password.
