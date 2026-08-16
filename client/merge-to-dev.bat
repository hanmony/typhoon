@echo off
for /f "tokens=*" %%i in ('git branch --show-current') do (
    set branchname=%%i
)
echo current branch is %branchname%
git switch dev
git pull
git merge %branchname%
git push
git switch %branchname%
