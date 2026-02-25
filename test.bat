@echo off
SET interactive=1
ECHO %CMDCMDLINE% | FIND /I "/c" >NUL 2>&1
IF %ERRORLEVEL% == 0 SET interactive=0

cd %~dp0
:: script main content
start bundle exec jekyll serve
bundle exec minitest test/*
:: end script main content

::echo The tests are finished running. Please close the localhost window that was created.

IF "%interactive%"=="0" PAUSE
EXIT /B 0
