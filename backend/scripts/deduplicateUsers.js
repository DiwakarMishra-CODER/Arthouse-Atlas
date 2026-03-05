/**
 * One-time script to remove duplicate entries from
 * watchlist, favorites, and watched arrays for all users.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/User.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });


const deduplicateUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({});
        console.log(`👥 Found ${users.length} user(s) to check\n`);

        let totalFixed = 0;

        for (const user of users) {
            const before = {
                watchlist: user.watchlist.length,
                favorites: user.favorites.length,
                watched:   user.watched.length,
            };

            // Deduplicate each array by converting ObjectId → string, then back
            user.watchlist = [...new Map(user.watchlist.map(id => [id.toString(), id])).values()];
            user.favorites = [...new Map(user.favorites.map(id => [id.toString(), id])).values()];
            user.watched   = [...new Map(user.watched.map(id =>   [id.toString(), id])).values()];

            const after = {
                watchlist: user.watchlist.length,
                favorites: user.favorites.length,
                watched:   user.watched.length,
            };

            const dupsRemoved =
                (before.watchlist - after.watchlist) +
                (before.favorites - after.favorites) +
                (before.watched   - after.watched);

            if (dupsRemoved > 0) {
                await user.save();
                totalFixed += dupsRemoved;
                console.log(`🔧 Fixed user "${user.username}" (${user.email})`);
                console.log(`   watchlist: ${before.watchlist} → ${after.watchlist}`);
                console.log(`   favorites: ${before.favorites} → ${after.favorites}`);
                console.log(`   watched:   ${before.watched}   → ${after.watched}\n`);
            } else {
                console.log(`✓  "${user.username}" — no duplicates found`);
            }
        }

        console.log(`\n🎬 Done. ${totalFixed} duplicate ID(s) removed across all users.`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
};

deduplicateUsers();
