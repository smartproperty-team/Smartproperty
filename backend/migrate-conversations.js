const mongoose = require('mongoose');
const crypto = require('crypto');

async function fixConversations() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartproperty';
    console.log(`Connecting to MongoDB: ${mongoUri}\n`);
    
    const conn = await mongoose.connect(mongoUri);
    const db = conn.connection.getClient().db('smartproperty');
    const chats = db.collection('chats');
    const messages = db.collection('messages');
    
    console.log('🔍 Starting conversation consolidation...\n');
    
    // Get all chats with their participant IDs
    const allChats = await chats.find({}).toArray();
    console.log(`Found ${allChats.length} total chats\n`);
    
    // Step 1: Group chats by sorted participant IDs to find duplicates
    const groups = {};
    const chatsByKey = {};
    
    for (const chat of allChats) {
      const sorted = chat.participantIds.sort().join('|');
      if (!groups[sorted]) {
        groups[sorted] = [];
      }
      groups[sorted].push(chat);
    }
    
    // Find duplicates
    const duplicateGroups = Object.entries(groups).filter(([_, chats]) => chats.length > 1);
    console.log(`Found ${duplicateGroups.length} conversation groups with duplicates\n`);
    
    let merged = 0;
    
    // Merge duplicate conversations
    for (const [key, chats] of duplicateGroups) {
      // Sort by creation date, keep oldest
      const sorted = chats.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepChat = sorted[0];
      const mergeChats = sorted.slice(1);
      
      console.log(`  Merging ${mergeChats.length} chats into ${keepChat._id}`);
      console.log(`    Participants: ${key}`);
      
      // Move all messages to the keeper chat
      for (const mergeChat of mergeChats) {
        await messages.updateMany(
          { chatId: mergeChat._id },
          { $set: { chatId: keepChat._id } }
        );
        
        // Delete old chat
        await chats.deleteOne({ _id: mergeChat._id });
        merged++;
      }
    }
    
    console.log(`\n✅ Merged ${merged} duplicate conversation chats\n`);
    
    // Step 2: Add conversationId to all remaining chats
    const updatedChats = await chats.find({}).toArray();
    console.log(`Adding conversationId to ${updatedChats.length} chats...\n`);
    
    let updated = 0;
    for (const chat of updatedChats) {
      if (!chat.conversationId) {
        const sorted = chat.participantIds.sort().join('|');
        const conversationId = crypto
          .createHash('sha256')
          .update(sorted)
          .digest('hex');
        
        await chats.updateOne(
          { _id: chat._id },
          { $set: { conversationId } }
        );
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} chats with conversationId\n`);
    
    // Step 3: Create indexes
    console.log('Creating database indexes...\n');
    try {
      await chats.createIndex({ conversationId: 1 }, { unique: true, sparse: true });
      console.log('  ✓ conversationId index');
    } catch (e) {
      console.log(`  ! conversationId index (${e.message})`);
    }
    
    try {
      await chats.createIndex({ participantIds: 1 });
      console.log('  ✓ participantIds index');
    } catch (e) {
      console.log(`  ! participantIds index (${e.message})`);
    }
    
    try {
      await chats.createIndex({ lastMessageAt: -1, isDeleted: 1 });
      console.log('  ✓ lastMessageAt index');
    } catch (e) {
      console.log(`  ! lastMessageAt index (${e.message})`);
    }
    
    try {
      await messages.createIndex({ chatId: 1, createdAt: -1 });
      console.log('  ✓ messages chatId index');
    } catch (e) {
      console.log(`  ! messages chatId index (${e.message})`);
    }
    
    console.log('\n✅ Conversation consolidation complete!\n');
    console.log('Summary:');
    console.log(`  - Merged ${merged} duplicate chats`);
    console.log(`  - Updated ${updated} chats with conversationId`);
    console.log(`  - Created indexes for optimal performance\n`);
    
    await mongoose.disconnect();
    console.log('✅ Migration finished successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixConversations();
