filepath = "/Applications/My Mac/Development/Projects/IndiaNext/hackathon-website/app/page.tsx"
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace('bg-[#030303]', 'bg-black/20')
content = content.replace('bg-[#020202]', 'bg-black/20')

with open(filepath, 'w') as f:
    f.write(content)
