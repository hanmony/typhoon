#! /bin/bash

branchname=$(git branch --show-current)
echo current branch is $branchname
git switch dev
git pull
git merge $branchname
git push
git switch $branchname
echo done !!

