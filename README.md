# Cursor-Hackathon

Shared workspace for the hackathon project. Two collaborators use **one integration branch** and short-lived **feature branches**.

## Branch model (2 people)

| Branch | Purpose |
|--------|---------|
| `main` | Stable, demo-ready, tagged releases if needed |
| `develop` | Day-to-day integration; merge feature work here first |
| `feature/<short-name>` | One branch per task or person (e.g. `feature/auth-api`, `feature/jane-ui`) |

**Flow:** branch from `develop` → open PR into `develop` → when ready, PR `develop` → `main`.

## Publish to GitHub (first time)

1. Log in (one-time): `gh auth login`
2. Create the remote and push (from this folder):

```bash
cd /Users/habibrahal/Documents/GitHub/Hackathons
gh repo create Cursor-Hackathon --public --source=. --remote=origin --push
```

If the repo already exists under your account:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Cursor-Hackathon.git
git push -u origin main
git push -u origin develop
```

## Optional: GitLab mirror

Useful if your team tracks work in GitLab or you want a backup remote.

```bash
git remote add gitlab git@gitlab.com:YOUR_GROUP_OR_USER/Cursor-Hackathon.git
git push gitlab main
git push gitlab develop
```

To push all branches and tags once:

```bash
git push gitlab --all
git push gitlab --tags
```

Keep `origin` as GitHub for day-to-day work, or set GitLab as a [mirror](https://docs.gitlab.com/ee/user/project/repository/mirror/) from the GitLab project settings.
