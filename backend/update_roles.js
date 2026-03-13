import mongoose from 'mongoose';

async function updateUsers() {
    await mongoose.connect('mongodb://localhost:27017/vms-garments');
    const r = await mongoose.connection.db.collection('users').updateMany({role:'staff'}, {$set: {role:'client'}});
    console.log('Updated:', r.modifiedCount, 'user(s) from staff to client');
    await mongoose.disconnect();
}
updateUsers();
