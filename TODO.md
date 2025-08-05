TODO instructions: When using the instructions and completing the task. Make sure you fill out steps you did that achieved the desired results in the LESSONS_LEARNED.md file. correlate the number associated with the task into the LESSONS_LEARNED file. IE: if the TODO task is 1.1 then the solution on the LESSONS_LEARNED would also be 1.1. Furthermore if a task IE: 2.1 needs to have subtasks 2.1.1, 2.1.2, etc...then fill free to generate those tasks in the TODO file and correlate them in the LESSONS_LEARNED file. 


# Multistate button
- [x] 1.1 When in a table and you click on the button the state doesn't always change. 
- [x] 1.2 Add a feature in the settings to add color associations to keys so that no matter the order of the state the color will be the same based off of the lowercase version of the key name.
  - [x] 1.2.1 Add stateColorMappings to DEFAULT_SETTINGS with common state colors
  - [x] 1.2.2 Create getStateColor() method to determine color based on state key
  - [x] 1.2.3 Add color utility methods (applyMultiStateColor, darkenColor, getContrastColor)
  - [x] 1.2.4 Modify createMultiStateElement to use key-based colors instead of index-based
  - [x] 1.2.5 Add settings UI for managing color mappings with add/delete functionality
  - [x] 1.2.6 Create color table display with preview and management controls
  - [x] 1.2.7 have the color input be a color picker
  - [x] 1.2.8 Be able to change the order in which the names show up which will correlate with the order in which they cycle through when being clicked. 
- [ ] 1.3 Allow there to be groupings of multistate buttons which you can choose from when placing the button. Based off of the grouping the set options and colors are associated. These are all accessed through the settings pannel. 

# All Buttons
- [ ] 2.1 When you click on a button and the state changes it brings you back up to the top of the page.  

# Dropdown user selector
- [ ] 3.1 When you click on the dropdown menu when it is in a table it shows you the raw text. IE: {{userdropdown:userdropdown-1754425281873-k1psfdw8e::Tyler}}

# General functionality
- [x] 4.1 all clean logging functionality to the actions that will populate in the console.  
- [x] 4.1.1 add log functionality for all events for debugging purposes