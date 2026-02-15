
import mongoose from 'mongoose';

const listDBs = async () => {
    try {
        const client = await mongoose.connect('mongodb://127.0.0.1:27017');
        const admin = client.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(db => db.name));
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listDBs();
