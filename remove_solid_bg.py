import re

filepath = "/Applications/My Mac/Development/Projects/IndiaNext/hackathon-website/app/page.tsx"
with open(filepath, 'r') as f:
    content = f.read()

# Make sections transparent or translucent
content = content.replace('bg-[#151232]', 'bg-black/20')
content = content.replace('bg-[#0f0c29]', 'bg-black/20')
# Fix CyberBackground specifically so it doesnt block
cyber_str_old = """const CyberBackground = () => (
    <div className="fixed inset-0 z-0 bg-black/20 perspective-1000 overflow-hidden">
        {/* Deep Space Base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#0d0d1a_0%,#000000_100%)]" />"""
cyber_str_new = """const CyberBackground = () => (
    <div className="fixed inset-0 z-0 perspective-1000 overflow-hidden border-none mix-blend-screen pointer-events-none">
        {/* Removed black radial gradient to reveal main page gradient */}\n"""
content = content.replace(cyber_str_old, cyber_str_new)

# Update main wrapping gradient
old_wrapper = 'className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden"'
new_wrapper = 'className="min-h-screen bg-gradient-to-b from-[#111A31] via-[#2F1D51] to-[#1F1738] text-white font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden"'
content = content.replace(old_wrapper, new_wrapper)

with open(filepath, 'w') as f:
    f.write(content)

print(content.count('bg-gradient-to-b'))
