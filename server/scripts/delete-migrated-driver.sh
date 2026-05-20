#!/bin/bash
# Deletes all drivers migrated from the old DB via the Cloud SQL Auth Proxy on port 5434
PGPASSWORD=kyNNNZVOa2L6ulKOTkXhOh5kLEm1nBK psql -h localhost -p 5434 -U yellow yellow \
  -c "SELECT id, name, phone FROM drivers;" \
  -c "DELETE FROM drivers;" \
  -c "SELECT count(*) as remaining_drivers FROM drivers;"
