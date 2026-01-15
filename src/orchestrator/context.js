import db from '../config/db.js';

async function getContext(userId, platform = 'whatsapp') {
  try {
    const res = await db.query(
      'SELECT session_data FROM sessions WHERE user_id = $1 AND platform = $2',
      [userId, platform]
    );

    if (res.rows.length > 0) {
      return res.rows[0].session_data || { stage: 'initial', cart: [], history: [] };
    }

    return { stage: 'initial', cart: [], history: [] };
  } catch (error) {
    console.error('Error fetching context:', error);
    return { stage: 'initial', cart: [], history: [] };
  }
}

async function updateContext(userId, context, platform = 'whatsapp') {
  try {
    // Ensure cart exists
    if (!context.cart) context.cart = [];

    await db.query(
      `INSERT INTO sessions (user_id, platform, session_data, last_active)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, platform)
       DO UPDATE SET session_data = $3, last_active = NOW()`,
      [userId, platform, JSON.stringify(context)]
    );
  } catch (error) {
    console.error('Error updating context:', error);
  }
}

export { getContext, updateContext };
