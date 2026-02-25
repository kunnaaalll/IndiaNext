import re

files_to_update = [
    "/Applications/My Mac/Development/Projects/IndiaNext/hackathon-website/app/page.tsx",
    "/Applications/My Mac/Development/Projects/IndiaNext/hackathon-website/app/components/HackathonForm.tsx"
]

for filepath in files_to_update:
    with open(filepath, 'r') as f:
        content = f.read()

    # Increase brightness of gray texts
    content = content.replace('text-gray-700', 'text-gray-400')
    content = content.replace('text-gray-600', 'text-gray-300')
    content = content.replace('text-gray-500', 'text-gray-200')
    content = content.replace('text-gray-400', 'text-gray-100')
    content = content.replace('text-gray-300', 'text-white')
    
    content = content.replace('text-slate-600', 'text-slate-300')
    content = content.replace('text-slate-500', 'text-slate-200')
    content = content.replace('text-slate-400', 'text-slate-100')

    # Replace black / #050505 backgrounds with transpanrent or specific branding colors
    # We want the main container to have the background gradient, and child components to be translucent
    if "page.tsx" in filepath:
        # the main root wrapper
        content = content.replace('bg-[#050505]', 'bg-[#0f0c29]')
        # replace bg-black with a semi-transparent dark shade or translucent to let gradient show
        content = content.replace('bg-black', 'bg-[#151232]')
        
        # specific fix for the Root div gradient
        content = content.replace('className="min-h-screen bg-[#0f0c29]', 'className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]')

    if "HackathonForm.tsx" in filepath:
        content = content.replace('bg-slate-950', 'bg-[#0f0c29]')
        content = content.replace('bg-slate-900', 'bg-[#151232]')

    with open(filepath, 'w') as f:
        f.write(content)

print("Replaced gray text colors and backgrounds!")

