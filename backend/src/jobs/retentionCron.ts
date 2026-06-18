import cron from 'node-cron';
import prisma from '../utils/prisma.js';

// Run every midnight: '0 0 * * *'
// For testing purposes during development, you can change this to run more frequently, e.g., '*/1 * * * *'
export const startRetentionCron = () => {
  console.log('[Cron] Initializing NAP Retention Schedules cron job...');

  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running NAP Retention Schedules check...');

    try {
      const now = new Date();

      // Find all files that have passed their retention date, are not yet archived, and don't already have a pending archival request
      const expiredFiles = await prisma.file.findMany({
        where: {
          retentionDate: {
            lte: now,
          },
          isArchived: false,
        },
      });

      if (expiredFiles.length === 0) {
        console.log('[Cron] No files require retention processing today.');
        return;
      }

      console.log(`[Cron] Found ${expiredFiles.length} files that have exceeded retention periods. Processing...`);

      // We need a system admin user ID to attach to the ApprovalRequest, or we can just leave it as a "SYSTEM" requester if the DB allows.
      // But ApprovalRequest requires requesterId. Let's find an admin user.
      const systemAdmin = await prisma.user.findFirst({
        where: { role: 'admin' },
      });

      if (!systemAdmin) {
        console.error('[Cron] Critical Error: No admin user found to associate with automated retention requests.');
        return;
      }

      for (const file of expiredFiles) {
        // Check if there's already a pending request for this file
        const existingRequest = await prisma.approvalRequest.findFirst({
          where: {
            entityId: file.id,
            status: 'PENDING',
            actionType: 'ARCHIVE_FILE', // or DISPOSE_FILE
          },
        });

        if (existingRequest) {
          continue; // Already queued
        }

        // Create an Approval Request for the admin to review
        await prisma.approvalRequest.create({
          data: {
            actionType: 'ARCHIVE_FILE', // We queue for Archival, admin can approve to archive
            entityType: 'File',
            entityId: file.id,
            requesterId: systemAdmin.id, // Act as system
            payload: {
              fileId: file.id,
              originalName: file.filename,
              reason: 'NAP Retention Schedule Expired',
              retentionDate: file.retentionDate,
              action: 'ARCHIVE_FILE'
            },
            status: 'PENDING',
          },
        });

        console.log(`[Cron] Queued ApprovalRequest (ARCHIVE_FILE) for File ID: ${file.id}`);
      }

      console.log('[Cron] NAP Retention check completed.');
    } catch (error) {
      console.error('[Cron] Error running retention check:', error);
    }
  });
};
