const {Storage}= require('@google-cloud/storage');
let credentials;
try {
    if (process.env.GCP_SERVICE_ACCOUNT) {
        credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
    } else {
        console.warn('⚠️ GCP_SERVICE_ACCOUNT is missing in .env');
    }
} catch (error) {
    console.error('❌ Failed to parse GCP_SERVICE_ACCOUNT JSON:', error.message);
}

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials
});

module.exports = storage;   