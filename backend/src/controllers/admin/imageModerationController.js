const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const { logAdminAction } = require('../../utils/adminLogger');

// 5.4 Image Moderation: review uploaded body images across all users.
async function listImages(req, res) {
  const users = await User.find({ 'bodyAnalysis.images': { $exists: true } })
    .select('name email bodyAnalysis.images bodyAnalysis.analyzedAt')
    .sort({ 'bodyAnalysis.analyzedAt': -1 });

  const items = users.flatMap((u) =>
    ['front', 'back', 'left', 'right']
      .filter((key) => u.bodyAnalysis?.images?.[key])
      .map((key) => ({
        userId: u._id,
        userName: u.name,
        userEmail: u.email,
        angle: key,
        url: u.bodyAnalysis.images[key],
        analyzedAt: u.bodyAnalysis.analyzedAt,
      }))
  );

  res.json({ items });
}

// Delete flagged content: removes the file + clears the reference on the user.
async function deleteImage(req, res) {
  const { userId, angle } = req.params;
  if (!['front', 'back', 'left', 'right'].includes(angle)) return res.status(400).json({ message: 'Invalid angle' });

  const user = await User.findById(userId);
  if (!user?.bodyAnalysis?.images?.[angle]) return res.status(404).json({ message: 'Image not found' });

  const filePath = path.join(__dirname, '..', '..', '..', user.bodyAnalysis.images[angle].replace('/uploads/', 'uploads/'));
  fs.unlink(filePath, () => {}); // best-effort; ignore ENOENT

  user.bodyAnalysis.images[angle] = undefined;
  await user.save();

  await logAdminAction(req.user._id, 'image.delete', { targetType: 'User', targetId: user._id, details: angle });
  res.json({ message: 'Image removed' });
}

module.exports = { listImages, deleteImage };
