import os

file_path = "d:/Agentic API Testing/backend/core/router.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define replacements
replacements = [
    # Get Test History Response Map
    ("passed = run['passed']", "passed = run['passed_count']"),
    ("failed = run['failed']", "failed = run['failed_count']"),
    
    # Get Test Trends Annotation
    ("passed=Count('id', filter=Q(passed=True))", "passed_count=Count('id', filter=Q(passed=True))"),
    ("failed=Count('id', filter=Q(passed=False))", "failed_count=Count('id', filter=Q(passed=False))"),
    
    # Get Test Trends Response Map
    ("passed = item['passed']", "passed = item['passed_count']"),
    ("failed = item['failed']", "failed = item['failed_count']"),
    
    # Get Flaky Tests Response Map
    ("'passed': test['passed']", "'passed': test['passed_count']"),
    
    # Get Collection Health Response Map
    ("passed = endpoint['passed']", "passed = endpoint['passed_count']"),
    
    # Get Flaky Tests Filtering
    ("passed__gt=0", "passed_count__gt=0"),
    ("failed__gt=0", "failed_count__gt=0"),
    ("order_by('-failed')", "order_by('-failed_count')"),
    ("failed = test['failed']", "failed = test['failed_count']")
]

new_content = content
for old, new in replacements:
    new_content = new_content.replace(old, new)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched router.py")
else:
    print("No changes made (strings not found?)")
