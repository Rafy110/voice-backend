const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function backupDatabase() {
  try {
    const fileContent = fs.readFileSync('/data/calls.db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `calls-backup-${timestamp}.db`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileContent,
    }));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Backup uploaded successfully',
      key
    }));
  } catch (err) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Backup failed',
      error: err.message
    }));
  }
}

backupDatabase();