# Teams Ranking Filter - Testing Guide

## New Features Added

### 1. Ranking Filter Options

- **All Teams**: Shows all teams without ranking focus
- **IdeaSprint Rankings**: Shows only IdeaSprint teams sorted by score
- **BuildStorm Rankings**: Shows only BuildStorm teams sorted by score
- **Combined Rankings**: Shows all teams sorted by overall score

### 2. Score Calculation

- Calculates average score from `CriterionScore` table
- Shows score count (number of judges who scored)
- Displays current rank based on calculated scores

### 3. Enhanced Table Display

- **Judge Mode**: Shows Score and Rank columns when user has JUDGE role
- **Mobile View**: Shows score and rank badges in mobile cards
- **Desktop View**: Dedicated Score and Rank columns with icons

## Testing Steps

### Test 1: Judge Role Ranking Filter

1. Login as a user with JUDGE role
2. Navigate to Teams panel
3. Verify ranking filter dropdown appears with Trophy icon
4. Test each ranking mode:
   - IdeaSprint Rankings → should filter to IDEA_SPRINT track
   - BuildStorm Rankings → should filter to BUILD_STORM track
   - Combined Rankings → should show all tracks

### Test 2: Score Display

1. Ensure teams have scores in `CriterionScore` table
2. Verify score calculation shows average of all criterion scores
3. Check score count shows number of judges who scored
4. Verify "Not scored" appears for teams without scores

### Test 3: Ranking Calculation

1. Verify teams are ranked by calculated score (highest first)
2. Check rank numbers are sequential (1, 2, 3, etc.)
3. Verify tied scores show same rank

### Test 4: Auto-Filter Behavior

1. Select "IdeaSprint Rankings" → should auto-set track to IDEA_SPRINT
2. Select "BuildStorm Rankings" → should auto-set track to BUILD_STORM
3. Verify sorting automatically changes to ranking-based

## Expected Results

✅ **Ranking Filter**: Appears only for JUDGE role users
✅ **Score Calculation**: Shows average of criterion scores
✅ **Rank Display**: Shows position based on calculated score
✅ **Track Filtering**: Auto-filters by track when ranking mode selected
✅ **Mobile Responsive**: Score/rank badges show in mobile view
✅ **Desktop Table**: Dedicated Score and Rank columns with proper icons
