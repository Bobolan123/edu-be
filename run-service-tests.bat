@echo off
REM Script to run unit tests for specific services

echo Running unit tests for services...
echo ==================================
echo.

REM Run tests for the 5 services
npm test -- --testPathPattern="(enrollment|order|review|user|course-indexing).service.spec.ts" --verbose

echo.
echo ==================================
echo Tests completed!
pause
