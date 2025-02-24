import pandas as pd

# Load data from an Excel file
data = pd.read_excel('data.xlsx')

# Create a pivot table
pivot_table = pd.pivot_table(data, values=['Total Attendees', 'Total Male', 'Total Female'],
                             index=['Events', 'Event Outcomes', 'National Level', 'Type.Category'],
                             aggfunc='sum')

# Save the pivot table to a new Excel file
pivot_table.to_excel('pivot_table.xlsx')