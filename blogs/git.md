# Git

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2023-10-08
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/git/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/git/

## 📚 Basics

### Concepts

- A branch is just a pointer to a snapshot node
- Snapshot nodes form a directed acyclic graph
- The HEAD pointer points to the snapshot node that matches the current state of the working directory

### The three areas

Working Directory

Staging Area

### The three states of a file

#### Modified
Once a file that git already knows about has been changed since the last commit, it enters this state. (A file git doesn't know about won't enter the Modified state even if it changes, e.g. a new file or a file covered by `.gitignore`.)

#### Staged

A file (or some of the changes in it) that you've added with git add enters the Staged state.

#### Checking file status

Use `git status` to see the current state of the repo: which files have been modified and which have been staged

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   components/blog/TocNav.vue
        modified:   content/blogs/git.md
        modified:   content/blogs/importtype-import.md
        modified:   nuxt.config.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        components/content/ProseH4.vue
        content/blogs/package-json.md
        content/blogs/react-native-pitfalls.md
        content/blogs/use-githook-to-improve-publish-process.md
        content/zh/blogs/

no changes added to commit (use "git add" and/or "git commit -a")
```

With `git status -s` you get a shorter format
- M means the file is in the Modified state
- A means all changes to the file are in the staging area
- AM means some of the file's changes are staged and some are not
- `??` means the file is unknown to git (i.e. not tracked by git)

```shell
 M components/blog/TocNav.vue
 M content/blogs/git.md
 M content/blogs/importtype-import.md
 A nuxt.config.ts
AM components/content/ProseH4.vue
?? content/blogs/package-json.md
?? content/blogs/react-native-pitfalls.md
?? content/blogs/use-githook-to-improve-publish-process.md
?? content/zh/blogs/
```

## 📄 Commands

### The basics
```sh
git add ${files}
git checkout ${branchName}
git checkout -b ${newBranch}  # create a new branch from the current one and check it out
git checkout - # switch back to the previous branch
```

### Inspecting

```sh
git status # show status
git status -s # show status as a list of files
git branch --show-current # print the current branch name
git log ${branch} # show a branch's commit history
git show ${commitHash} # show the changes in a given commit


git diff --name-only # list the names of all files currently in the Modified state
git diff --staged --name-only # list the names of all staged files, typically used for things like formatting before a commit

# list the names of all staged files, only showing added, copied and modified files
git diff --staged --diff-filter=ACM

# format every staged file with prettier
git diff --staged --name-only | xargs prettier --write 
```

### Stashing changes

Say you've changed a bunch of code on branch A but it's not finished, and you suddenly need to switch to branch B for something else. You can stash the code

```sh
git stash  # stash unstaged changes 
git stash apply
git stash pop # pop the most recent stashed changes 
git stash drop # drop the stash
git stash list  # show the stash stack
```

Or you can just throw it all away
```sh
git restore ${filename}  # discard unstaged changes to a file
git restore --staged ${filename} # remove a file from the staging area
```



### Moving changes around
```sh
git merge ${branch}  # merge branch into the current branch
git cherry-pick ${commitHash} # pick the commitHash commit onto the current branch
```

### The last commit

If you've committed but haven't pushed to the remote and want to undo it, use a soft reset; the changes come back out
```sh
git reset --soft HEAD~1
git reset --soft HEAD~n # soft-reset several commits at once
```

If you've committed but haven't pushed and want to change the commit message, use amend
```sh
git commit --amend
```

### Syncing with the remote
```sh
git fetch --all
git pull # equivalent to fetch + merge
git pull --rebase
git commit -m ${message}
git push
```

### Hard reset

Force-reset a local branch
```sh
git reset --hard HEAD~n
git reset --hard origin/master
```

Force-reset the remote (danger zone)
```sh
git reset --hard xxx
git push -f
```

## A few tricks

You can combine the commands above into some handy shortcuts

For example, I'm on branch A and want to update branch B, then merge B into A
```sh
# as a shell function
update_merge() {
  git checkout B
  git pull
  git checkout -
  git merge B
}

# with aliases, it fits on one line
gco B && pull && gco - && git merge B
```



## Tags
```sh
git tag v1.0.0    # tag the current HEAD
git push --tags   # push tags
```

## alias

> **Info**
>
> Here are the aliases I use most

```sh
alias ggr="git log --oneline --decorate --graph --all"
alias gco="git checkout"
alias glog="git log"
alias gst="git status"

alias gs="git stash"
alias gsp="git stash pop"

alias gdropall="git restore ." # discard all changes in unstaged

alias gb="git branch"  # show the current branch

alias gcp="git cherry-pick"

alias gfa="git fetch --all"
alias gplr="git pull --rebase"
```
