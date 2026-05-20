#!/bin/bash
export DATABASE_URL="postgresql://yellow:kyNNNZVOa2L6ulKOTkXhOh5kLEm1nBK@localhost:5434/yellow"
cd /Users/whereischethan/yellow-design/server
npx prisma db push
