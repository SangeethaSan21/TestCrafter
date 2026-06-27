"""
Export Utilities
"""

import csv
import io

def export_to_csv(test_cases: list) -> str:
    """Export test cases to CSV format"""
    
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=['ID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Priority']
    )
    writer.writeheader()
    
    for tc in test_cases:
        writer.writerow({
            'ID': tc['id'],
            'Title': tc['title'],
            'Preconditions': tc['preconditions'],
            'Steps': ' | '.join(tc['steps']),
            'Expected Result': tc['expected_result'],
            'Priority': tc['priority']
        })
    
    output.seek(0)
    return output.getvalue()