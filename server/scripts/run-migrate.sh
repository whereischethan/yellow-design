#!/bin/bash
export OLD_DB_URL="postgresql://postgres:YellowSecure2026@localhost:5433/yellow"
export NEW_DB_URL="postgresql://yellow:kyNNNZVOa2L6ulKOTkXhOh5kLEm1nBK@localhost:5434/yellow"
cd /Users/whereischethan/yellow-design/server
npm run migrate
