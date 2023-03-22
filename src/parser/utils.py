#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

def _build_tree(nodes):
    stack = []
    for node in nodes:
        if len(stack) == 0:
            stack.append(node)
        else:
            parent = stack[len(stack) - 1]

            while len(parent['children']) == 2:
                stack.pop()
                parent = stack[len(stack) - 1]

            if len(parent['children']) < 2:
                parent['children'].append(node)

                if node['type'] == 'node':
                    stack.append(node)
    return stack[0]


def _humanize(S):
    if type(S) is not list:
        return S.strip().capitalize()
    else:
        return [s.strip().capitalize() for s in S]