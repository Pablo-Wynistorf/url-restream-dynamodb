# Deployment

## Deploy this app using AWS Apprunner and AWS DynamoDB

### Create DynamoDB table
First create a Dynamodb Table named: urlDB (Attention: Case sensitive)
In that database create a partition key called: urlId
Leave every other setting to default and create the table. 
Note: The Dynamodb Table needs to be in the same region as the apprunner service. 

### Then you need to create the IAM Role

Start with this cli command. This command creates the role, with the needed policys. 
Make sure to edit the file, and set your values (Region and AccountId): file://apprunner-role-policy2.json


```bash
aws iam create-role \
 --role-name apprunner-role \
 --assume-role-policy-document file://apprunner-role-policy1.json

 ---

aws iam create-policy \
 --policy-name apprunner-policy-url-restream \
 --policy-document file://apprunner-role-policy2.json

---
aws iam attach-role-policy --role-name apprunner-role-url-restream \
 --policy-arn arn:aws:iam::AWS_ACCOUNT_ID:policy/apprunner-policy-url-restream 

```

As soon as you are done with that, you can create the apprunner service_

1. Use Source code repo
2. Connect to github
3. Select your fork of this repo
4. As source directory select: /src
5. Select automatic deployment trigger and click next
6. Select "Use a configuration file" and click next
7. Enter a service name and select the created iam instance role.
8. Click next and the press deploy.

