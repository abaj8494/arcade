import copy
import hashlib
import networkx as nx
import matplotlib.pyplot as plt
import imageio
import os
from networkx.drawing.nx_agraph import graphviz_layout  # requires pygraphviz

######################################
#  Visualization Helper Code
######################################

class DFSVisualizer:
    def __init__(self):
        self.G = nx.DiGraph()
        self.frames = []
        self.step_count = 0

    def record_step(self, root_node, highlight_edge=None, title=""):
        """Draw the current graph using a top-down layout and save as a PNG frame."""
        self.step_count += 1
        fig, ax = plt.subplots(figsize=(8, 6))

        # Use Graphviz for a top-down hierarchical layout; ensure the root exists in the graph.
        pos = graphviz_layout(self.G, prog='dot', root=root_node)

        # Draw edges and nodes.
        nx.draw_networkx_edges(self.G, pos, ax=ax, arrowstyle='->', arrowsize=10)
        nx.draw_networkx_nodes(self.G, pos, ax=ax, node_size=500, node_color='lightblue')
        
        # Optionally, highlight a specific edge in red.
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
        """Combine saved PNG frames into an animated GIF and clean up the PNG files."""
        with imageio.get_writer(gif_name, mode='I', fps=fps) as writer:
            for frame_path in self.frames:
                image = imageio.imread(frame_path)
                writer.append_data(image)
        for frame_path in self.frames:
            os.remove(frame_path)
        print(f"GIF saved to {gif_name}")

######################################
#  Helper Functions for Board Encoding
######################################

def board_to_str(board):
    """Convert the board to a multi-line string for node labels."""
    rows = []
    for row in board:
        row_str = []
        for cell in row:
            if cell < 0:
                row_str.append('O')  # an empty spot
            elif cell == 0:
                row_str.append(' ')  # a cell that is not part of the board
            else:
                row_str.append('.')  # a peg
        rows.append("".join(row_str))
    return "\n".join(rows)

def make_node_id(board):
    """Generate a short unique ID based on the board state."""
    flat_str = "".join(str(x) for row in board for x in row)
    short_hash = hashlib.md5(flat_str.encode()).hexdigest()[:8]
    return f"node_{short_hash}"

######################################
#  PegSolitaire with DFS Visualization
######################################

N = 7  # board size

class PegSolitaire:
    def __init__(self, board, visualizer=None):
        # The board is a 2D list.
        self.board = board
        self.vis = visualizer
        self.visited = set()  # used to prevent re-visiting the same board state
        self.moves = []       # to store moves (if you want to print them later)
    
    def is_solved(self):
        pegs = 0
        position = []
        for i, row in enumerate(self.board):
            for j, cell in enumerate(row):
                if cell > 0:
                    position.append([i, j])
                    pegs += 1
                # Early exit if more than one peg exists.
                if pegs > 1:
                    return False
        # You can enforce a specific end location by checking `position == [[3,3]]`
        # For now, we return True if exactly one peg remains.
        return pegs == 1

    def get_valid_moves(self):
        """
        Check every cell for a peg and if it can jump over an adjacent peg
        into an empty space (represented by -1). Moves are returned as lists:
        [row, col, direction, jumped_value]
        where direction is 'w' (up), 'a' (left), 's' (down), or 'd' (right).
        """
        valid_moves = []
        for i, row in enumerate(self.board):
            for j, cell in enumerate(row):
                if cell > 0:  # found a peg
                    # Up
                    if i > 1 and self.board[i-2][j] < 0 and self.board[i-1][j] > 0:
                        valid_moves.append([i, j, "w", self.board[i-1][j]])
                    # Left
                    if j > 1 and self.board[i][j-2] < 0 and self.board[i][j-1] > 0:
                        valid_moves.append([i, j, "a", self.board[i][j-1]])
                    # Down
                    if i < N-2 and self.board[i+2][j] < 0 and self.board[i+1][j] > 0:
                        valid_moves.append([i, j, "s", self.board[i+1][j]])
                    # Right
                    if j < N-2 and self.board[i][j+2] < 0 and self.board[i][j+1] > 0:
                        valid_moves.append([i, j, "d", self.board[i][j+1]])
        return valid_moves

    def make_move(self, move):
        """
        Execute a move. The move is a list: [i, j, direction, jumped_value].
        After making the move, update the board and modify the move's position to reflect
        the new peg position.
        """
        self.moves.append(move)
        i, j, direction, jumped_value = move
        if direction == "w":
            self.board[i-1][j] = -1
            self.board[i-2][j] = self.board[i][j]
            self.board[i][j] = -1
            move[0] = i-2  # update row position
        elif direction == "a":
            self.board[i][j-1] = -1
            self.board[i][j-2] = self.board[i][j]
            self.board[i][j] = -1
            move[1] = j-2  # update column position
        elif direction == "s":
            self.board[i+1][j] = -1
            self.board[i+2][j] = self.board[i][j]
            self.board[i][j] = -1
            move[0] = i+2
        elif direction == "d":
            self.board[i][j+1] = -1
            self.board[i][j+2] = self.board[i][j]
            self.board[i][j] = -1
            move[1] = j+2

    def undo_move(self):
        """
        Undo the last move. The move contains the original position,
        the direction, and the value of the jumped peg.
        """
        move = self.moves.pop()
        i, j, direction, jumped_value = move
        if direction == "w":
            self.board[i+2][j] = self.board[i][j]
            self.board[i][j] = -1
            self.board[i+1][j] = jumped_value
        elif direction == "a":
            self.board[i][j+2] = self.board[i][j]
            self.board[i][j] = -1
            self.board[i][j+1] = jumped_value
        elif direction == "s":
            self.board[i-2][j] = self.board[i][j]
            self.board[i][j] = -1
            self.board[i-1][j] = jumped_value
        elif direction == "d":
            self.board[i][j-2] = self.board[i][j]
            self.board[i][j] = -1
            self.board[i][j-1] = jumped_value

    def solve_dfs(self, depth=0, max_depth=4):
        """
        Depth-limited DFS that builds a visualization graph.
        The search will expand up to `max_depth` levels deep.
        """
        board_str = board_to_str(self.board)      # multi-line string label for display
        node_id = make_node_id(self.board)          # unique node identifier

        if node_id in self.visited:
            return False
        self.visited.add(node_id)

        # Add the current board state as a node in the graph.
        if self.vis is not None:
            self.vis.G.add_node(node_id, label=board_str)

        if depth == 0:
            self.root_id = node_id  # store the root id for the layout

        if self.is_solved():
            print("Solution found!")
            return True

        if depth >= max_depth:
            return False

        for move in self.get_valid_moves():
            self.make_move(move)
            child_str = board_to_str(self.board)
            child_id = make_node_id(self.board)

            if self.vis is not None:
                self.vis.G.add_node(child_id, label=child_str)
                self.vis.G.add_edge(node_id, child_id)
                self.vis.record_step(
                    root_node=self.root_id,
                    highlight_edge=(node_id, child_id),
                    title=f"Depth {depth} -> {depth+1}"
                )
            
            if self.solve_dfs(depth + 1, max_depth):
                return True

            self.undo_move()  # Backtrack

        return False

##########################################
#  Main: Set up the Board, Run DFS, Build GIF
##########################################

if __name__ == "__main__":
    # Initialize the board.
    # Cells with a positive number represent pegs,
    # cells with -1 represent an empty (playable) spot,
    # and cells with 0 are non-playable areas.
    board = [
        [ 0,  0,  1,  2,  3,  0,  0],
        [ 0,  4,  5,  6,  7,  8,  0],
        [ 9, 10, 11, 12, 13, 14, 15],
        [16, 17, 18, -1, 19, 20, 21],
        [22, 23, 24, 25, 26, 27, 28],
        [ 0, 29, 30, 31, 32, 33,  0],
        [ 0,  0, 34, 35, 36,  0,  0]
    ]

    # Create the visualizer.
    viz = DFSVisualizer()

    # Create the game instance with the board and visualizer.
    game = PegSolitaire(board, visualizer=viz)
    
    # Run the DFS with a maximum depth of 4.
    solved = game.solve_dfs(depth=0, max_depth=3)
    if solved:
        print("A solution was found within 4 levels of depth!")
    else:
        print("No solution was found within the depth limit.")

    # Build the GIF showing the DFS traversal.
    viz.build_gif("dfs_traversal_4_levels.gif", fps=1)
