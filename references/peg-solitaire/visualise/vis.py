import copy
import hashlib
import networkx as nx
import matplotlib.pyplot as plt
import imageio
import os
from networkx.drawing.nx_agraph import graphviz_layout  # requires pygraphviz

######################################
#  Board & DFS Helper Code
######################################

EMPTY = -1
N     =  7

class DFSVisualizer:
    def __init__(self):
        self.G = nx.DiGraph()
        self.frames = []
        self.step_count = 0

    def record_step(self, root_node, highlight_edge=None, title=""):
        """Draw current graph top-down and save as PNG frame."""
        self.step_count += 1
        fig, ax = plt.subplots(figsize=(8, 6))
        
        # Use Graphviz for a top-down hierarchical layout
        # Note: root_node must be in the graph or graphviz_layout can fail
        pos = graphviz_layout(self.G, prog='dot', root=root_node)

        # Draw edges
        nx.draw_networkx_edges(self.G, pos, ax=ax, arrowstyle='->', arrowsize=10)
        # Draw nodes
        nx.draw_networkx_nodes(self.G, pos, ax=ax, node_size=500, node_color='lightblue')
        # Draw labels
        #nx.draw_networkx_labels(self.G, pos, ax=ax, font_size=0)

        # Optionally highlight a just-created edge in red
        if highlight_edge and highlight_edge in self.G.edges:
            nx.draw_networkx_edges(
                self.G, pos, ax=ax,
                edgelist=[highlight_edge],
                edge_color='red', width=2, arrowstyle='->', arrowsize=12
            )

        plt.title(f"{title} (Step {self.step_count})")
        plt.axis("off")

        filename = f"dfs_step_{self.step_count:03d}.png"
        plt.savefig(filename, dpi=150)
        plt.close(fig)

        self.frames.append(filename)

    def build_gif(self, gif_name="dfs_traversal.gif", fps=1):
        """Combine saved PNG frames into an animated GIF."""
        with imageio.get_writer(gif_name, mode='I', fps=fps) as writer:
            for frame_path in self.frames:
                image = imageio.imread(frame_path)
                writer.append_data(image)
        # Cleanup
        for frame_path in self.frames:
            os.remove(frame_path)
        print(f"GIF saved to {gif_name}")

######################################
#  PegSolitaire with Depth-Limited DFS
######################################

class PegSolitaire:
    def solve_dfs(self, depth=0, max_depth=3):
        """Depth-limited DFS: expand up to `max_depth` levels."""
        state_str = board_to_str(self.board)
        
        # If we've seen this exact board config or reached max depth, stop.
        if state_str in self.visited or depth > max_depth:
            return False
        self.visited.add(state_str)

        # Make sure the node is in the graph
        self.vis.G.add_node(state_str)

        # If depth == 0, that's our root node
        # We might store it to pass as 'root_node' in record_step
        # For subsequent calls, we keep using the same root.
        if depth == 0:
            self.root_state = state_str

        # If solved
        if self.is_solved():
            return True

        # Expand children
        valid_moves = self.get_valid_moves()
        for move in valid_moves:
            self.make_move()
            child_str = board_to_str(self.board)

            # Add child node + edge
            self.vis.G.add_node(child_str)
            self.vis.G.add_edge(state_str, child_str)

            # Record a step: highlight the newly added edge
            self.vis.record_step(
                root_node=self.root_state,
                highlight_edge=(state_str, child_str),
                title=f"Depth {depth} -> {depth+1}"
            )

            # DFS deeper
            if self.solve_dfs(depth + 1, max_depth):
                return True

            # Undo
            self.undo_move()

        return False


def board_to_str(board):
    """Generate the multi-line string representation you want."""
    rows = []
    for row in board:
        row_str = []
        for val in row:
            if val < 0:
                row_str.append('O')  
            elif val == 0:
                row_str.append(' ')
            else:
                row_str.append('.')  
        rows.append("".join(row_str))
    return "\n".join(rows)

def make_node_id(board):
    """Return a short hash or something that can serve as the node ID."""
    # Convert board to a single canonical string (no newlines) for hashing:
    flat_str = "".join(str(x) for row in board for x in row)
    short_hash = hashlib.md5(flat_str.encode()).hexdigest()[:8]
    return f"node_{short_hash}"

class PegSolitaire:

    def __init__(self, board, visualizer=None):
        self.board = board
        self.vis = visualizer
        self.visited = set()
        self.solution_moves = []
        self.moves = []

    def is_solved(self):
        pegs = 0
        position = []
        for i, row in enumerate(board):
            for col in range(len(row)):
                if (board[i][col] > 0):
                    position.append([i, col])
                    pegs+= 1
            if (pegs > 1):
                return False
        if (pegs == 1 and position == [[3,3]]):
            return True

    def get_valid_moves(self):
        valids = []
        for i, row in enumerate(board):
            for col in range(len(row)):
                if (board[i][col] > 0):
                    if (i > 1 and board[i-2][col] < 0 and board[i-1][col] > 0):
                        valids.append([i,col,"w",board[i-1][col]])
                    elif (col > 1 and board[i][col-2] < 0 and board[i][col-1] > 0): 
                        valids.append([i,col,"a",board[i][col-1]])
                    elif (i < N-2 and board[i+2][col] < 0 and board[i+1][col] > 0):
                        valids.append([i,col,"s",board[i+1][col]])
                    elif (col < N-2 and board[i][col+2] < 0 and board[i][col+1] > 0):
                        valids.append([i,col,"d",board[i][col+1]])
        print("VALID MOVES:", valids)
        print("MOVES thus far:", self.moves)
        return valids

    def make_move(self, move):
        self.moves.append(move)
        match move[2]:
            case "w":
                board[move[0]-1][move[1]] = -1
                board[move[0]-2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[0] -= 2
            case "a":
                board[move[0]][move[1]-1] = -1
                board[move[0]][move[1]-2] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[1] -= 2
            case "s":
                board[move[0]+1][move[1]] = -1
                board[move[0]+2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[0] += 2
            case "d":
                board[move[0]][move[1]+1] = -1
                board[move[0]][move[1]+2] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[1] += 2
    
    def undo_move(self):
        move = self.moves.pop()
        print("POPPED:", move)
        match move[2]:
            case "w":
                board[move[0]+2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                board[move[0]+1][move[1]] = move[3]
            case "a":
                board[move[0]][move[1]+2] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                board[move[0]][move[1]+1] = move[3]
            case "s":
                board[move[0]-2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                board[move[0]-1][move[1]] = move[3]
            case "d":
                board[move[0]][move[1]-2] = board[move[0]][move[1]] 
                board[move[0]][move[1]] = -1
                board[move[0]][move[1]-1] = move[3]

    def solve_dfs(self, depth=0, max_depth=3):
        board_str = board_to_str(self.board)      # multi-line label
        node_id   = make_node_id(self.board)      # simple ID

        # Only add if we haven't visited before:
        if node_id in self.visited:
            return False
        self.visited.add(node_id)

        # Add the node with a 'label' attribute (Graphviz uses that for display)
        self.vis.G.add_node(node_id, label=board_str)

        if depth == 0:
            self.root_id = node_id  # store root for `graphviz_layout`

        if self.is_solved():
            return True

        if depth >= max_depth:
            return False

        for move in self.get_valid_moves():
            self.make_move(move)
            child_label = board_to_str(self.board)
            child_id    = make_node_id(self.board)

            self.vis.G.add_node(child_id, label=child_label)
            self.vis.G.add_edge(node_id, child_id)
            self.vis.record_step(
                root_node=self.root_id,
                highlight_edge=(node_id, child_id),
                title=f"Depth {depth} -> {depth+1}"
            )
            
            if self.solve_dfs(depth + 1, max_depth):
                return True

            self.undo_move()
        
        return False

##########################################
#  Putting It All Together
##########################################

if __name__ == "__main__":
    # Example Board: (Use your real init board)
    board = [
        [ 0,  0,  1,  2,  3,  0,  0],
        [ 0,  0,  4,  5,  6,  0,  0],
        [ 7,  8,  9, 10, 11, 12, 13],
        [14,15,16,-1,17, 18, 19],
        [20,21,22,23,24,25,26],
        [ 0,  0, 27,28,29,  0,  0],
        [ 0,  0, 30,31,32,  0,  0]
    ]

    # 1) Create visualizer
    viz = DFSVisualizer()

    # 2) Run PegSolitaire with depth-limited DFS
    game = PegSolitaire(board, visualizer=viz)
    _ = game.solve_dfs(depth=0, max_depth=3)

    # 3) Build the GIF
    viz.build_gif("top_down_dfs.gif", fps=1)



