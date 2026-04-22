const mongoose = require('mongoose');
const path = require('path');
const projectDir = '/root/workspace/mas-projects/noobieteam';
require('dotenv').config({ path: path.join(projectDir, '.env') });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  method: { type: String, default: 'local' }
});
const User = mongoose.model('User', userSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noobieteam');
        const users = await User.find();
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
