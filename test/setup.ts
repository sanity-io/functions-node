import awsLite from '@aws-lite/client'

process.env.AWS_REGION = 'us-east-1'
process.env.SANITY_DISCO = 'test-disco-table'

awsLite.testing.enable()
