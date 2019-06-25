#!/usr/bin/env bash

npm install

# run the test
./node_modules/mocha/bin/mocha
[[ $? -eq 0 ]] || exit 1 #if test failed $? will be 1 and so we are exiting :)

ZIP_NAME="get-weather.zip"
LAMBDA_NAME="lambdaGetWeather"

zip -r ${ZIP_NAME} . -x "*test*" -x "*.secret*"
aws lambda --profile multipitch update-function-code --function-name ${LAMBDA_NAME} --zip-file fileb://${ZIP_NAME}
rm ${ZIP_NAME}

#NOTE in order to make it works locally you need to configure AWS with the right credential.
#In my case I have a profile `--profile multipitch` stored in `~/.aws/credentials`, you can also do not have a profile but have configured aws with aws configure.
#
#[multipitch]
#aws_access_key_id     = XXXXXXXXXXX
#aws_secret_access_key = XXXXXXXXXXXXVXXXXXXXXXXXX
#region                = eu-west-1
#