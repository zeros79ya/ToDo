const fs = require('fs');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the specific corrupted string (팀 일정)
    let newContent = content.split('?€ ?쇱젙').join('팀 일정');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Fixed ${filePath}`);
    } else {
        console.log(`No fixes needed for ${filePath}`);
    }
}

fixFile('src/app/page.tsx');
fixFile('src/components/dashboard-view.tsx');
fixFile('src/components/calendar-view.tsx');
fixFile('src/components/team-schedule-add-modal.tsx');
