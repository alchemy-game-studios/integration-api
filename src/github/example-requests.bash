curl -X GET "http://localhost:3000/github/pull-requests/count?owner=lodash&repo=lodash" \
     -H "Accept: application/json"

curl -X GET "http://localhost:3000/github/pull-requests/count/concurrent?owner=lodash&repo=lodash" \
     -H "Accept: application/json"

curl -X GET "http://localhost:3000/github/pull-requests/count/search?owner=lodash&repo=lodash" \
     -H "Accept: application/json"