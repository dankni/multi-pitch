#!/usr/bin/env bash

npm install

# run the test
npx mocha
[[ $? -eq 0 ]] || exit 1 #if test failed $? will be 1 and so we are exiting :)


# ship only runtime deps - dev tooling (mocha/chai) stays out of the artifact
npm prune --omit=dev

ZIP_NAME="get-tides.zip"
LAMBDA_NAME="lambdaGetTides"

zip -r ${ZIP_NAME} . -x "*test*" -x "*.secret*" -x "resp.json"
aws lambda --profile multipitch update-function-code --function-name ${LAMBDA_NAME} --zip-file fileb://${ZIP_NAME}
rm ${ZIP_NAME}
npm install # restore dev deps for local work

#NOTE in order to make it works locally you need to configure AWS with the right credential.
#In my case I have a profile `--profile multipitch` stored in `~/.aws/credentials`, you can also do not have a profile but have configured aws with aws configure.
#
#[multipitch]
#aws_access_key_id     = XXXXXXXXXXX
#aws_secret_access_key = XXXXXXXXXXXXVXXXXXXXXXXXX
#region                = eu-west-1
#
