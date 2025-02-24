import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Apply authentication middleware
router.use(isAuthenticated);

// Get all members
router.get('/', async (req, res) => {
  try {
    const members = await storage.getMembers();
    
    if (!members) {
      return res.status(404).json({ error: 'No members found' });
    }
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

export default router;
