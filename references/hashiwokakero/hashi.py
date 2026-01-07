import sys
import copy

MAX_ROW = 100
MAX_COL = 100
TRUE = 1
FALSE = 0
MAX_ISLANDS = 100
MAX_BRIDGES = 200
UP = 0
RIGHT = 1
DOWN = 2
LEFT = 3
DIRECTIONS = 4

class Island:
  def __init__(self, x, y, max_bridges):
    self.x = x
    self.y = y
    self.max_bridges = max_bridges
    self.curr_bridges = 0
    self.neighbours = [None] * DIRECTIONS
    self.nneighbours = 0

class Bridge:
  def __init__(self, island1, island2, direction):
    self.island1 = island1
    self.island2 = island2
    self.direction = direction
    self.symbol = ' '
    self.wires = 0
    self.skip = False

class Puzzle:
  def __init__(self):
    self.nodes = [None] * MAX_ISLANDS
    self.edges = [None] * MAX_BRIDGES
    self.nrows = 0
    self.ncols = 0
    self.nislands = 0
    self.nbridges = 0

def island2num(ch):
  if ch >= 'a' and ch <= 'c':
    return 10 + ord(ch) - ord('a')
  else:
    return ord(ch) - ord('0')

def is_island(ch):
  return ((ch >= '1' and ch <= '9') or (ch >= 'a' and ch <= 'c'))

def scan_map(fp, map, p):
  ch = fp.read(1)
  r = c = 0
  while ch != '':
    if ch == '\n':
      if c >= p.ncols:
        p.ncols = c
        r += 1
      c = 0
    else:
      map[r][c] = ch
      c += 1
    ch = fp.read(1)
  p.nrows = r
  return

def parse_map(map, p):
  p.nbridges = 0
  p.nislands = 0
  for i in range(p.nrows):
    for j in range(p.ncols):
      if is_island(map[i][j]):
        island = Island(j, i, island2num(map[i][j]))
        p.nodes[p.nislands] = island
        p.nislands += 1

  for j in range(p.nislands):
    island = p.nodes[j]
    for d in range(1, island.y + 1):
      if island.y == 0:
        break
      if is_island(map[island.y - d][island.x]):
        idx = getIsland(p, island.x, island.y - d)
        if idx != -1:
          island.neighbours[UP] = p.nodes[idx]
          island.nneighbours += 1
          break
    for d in range(1, p.nrows - island.y):
      if island.y == p.nrows -1 :
        break
      if is_island(map[island.y + d][island.x]):
        idx = getIsland(p, island.x, island.y + d)
        if idx != -1:
          island.neighbours[DOWN] = p.nodes[idx]
          island.nneighbours += 1
          break
    for d in range(1, island.x + 1):
      if island.x == 0:
        break
      if is_island(map[island.y][island.x - d]):
        idx = getIsland(p, island.x - d, island.y)
        if idx != -1:
          island.neighbours[LEFT] = p.nodes[idx]
          island.nneighbours += 1
          break
    for d in range(1, p.ncols - island.x):
      if island.x == p.ncols - 1:
        break
      if is_island(map[island.y][island.x + d]):
        idx = getIsland(p, island.x + d, island.y)
        if idx != -1:
          island.neighbours[RIGHT] = p.nodes[idx]
          island.nneighbours += 1
          break

def getIsland(p, x, y):
  for i in range(p.nislands):
    if p.nodes[i].x == x and p.nodes[i].y == y:
      return i
  return -1

def main(argv):
  char_map = [[' ' for _ in range(MAX_ROW)] for _ in range(MAX_COL)]
  p = Puzzle()
  if len(argv) != 2:
    print("Usage: %s <inputfile>" % argv[0])
    return 1
  fp = open(argv[1], 'r')
  if fp == None:
    print('Error reading file %s' % argv[1])
    return 1
  scan_map(fp, char_map, p)
  parse_map(char_map, p)
  solve_map(p, 0)
  print_map(p)
  return 0

def solve_map(p, idx):
  if idx == p.nislands:
    return check_solved(p)
  island = p.nodes[idx]
  for dir in range(DIRECTIONS):
    if can_build_bridge(p, island, dir):
      add_bridge(p, island, dir)
      if check_solved(p):
        return TRUE
      if solve_map(p, findBridge(p, idx, island.neighbours[dir])):
        return TRUE
      remove_bridge(p, island, dir)
  return FALSE

def print_map(p):
  soln = [[' ' for _ in range(p.ncols)] for _ in range(p.nrows)]
  for i in range(p.nislands):
    max = p.nodes[i].max_bridges
    if max == 10:
      soln[p.nodes[i].y][p.nodes[i].x] = 'a'
    elif max == 11:
      soln[p.nodes[i].y][p.nodes[i].x] = 'b'
    elif max == 12:
      soln[p.nodes[i].y][p.nodes[i].x] = 'c'
    else:
      soln[p.nodes[i].y][p.nodes[i].x] = '0' + str(max)
  for i in range(p.nbridges):
    bridge = p.edges[i]
    if bridge.skip:
      continue
    dist = abs(bridge.island1.x - bridge.island2.x + bridge.island1.y - bridge.island2.y) - 1
    for j in range(dist):
      if bridge.direction == UP:
        soln[bridge.island1.y - j - 1][bridge.island1.x] = bridge.symbol
      elif bridge.direction == DOWN:
        soln[bridge.island1.y + j + 1][bridge.island1.x] = bridge.symbol
      elif bridge.direction == LEFT:
        soln[bridge.island1.y][bridge.island1.x - j - 1] = bridge.symbol
      elif bridge.direction == RIGHT:
        soln[bridge.island1.y][bridge.island1.x + j + 1] = bridge.symbol
  for i in range(p.nrows):
    print(''.join(soln[i]))
  return

def check_solved(p):
  for i in range(p.nislands):
    if p.nodes[i].curr_bridges != p.nodes[i].max_bridges:
      return FALSE
  return TRUE

def can_build_bridge(p, island, dir):
  island1 = island
  island2 = island.neighbours[dir]
  if island2 == None:
    return FALSE
  bridge = None
  for i in range(p.nbridges):
    bridge = p.edges[i]
    if ((bridge.island1 == island1 and bridge.island2 == island2) or
        (bridge.island1 == island2 and bridge.island2 == island1)):
      if bridge.wires == 3:
        return FALSE
      if (bridge.island2.curr_bridges != bridge.island2.max_bridges and
          bridge.island1.curr_bridges != bridge.island1.max_bridges):
        return TRUE
  soln = [[0 for _ in range(p.ncols)] for _ in range(p.nrows)]
  for i in range(p.nislands):
    island = p.nodes[i]
    soln[island.y][island.x] = 1
  for i in range(p.nbridges):
    bridge = p.edges[i]
    if bridge.skip:
      continue
    island1 = bridge.island1
    island2 = bridge.island2
    dist = abs(island1.x - island2.x + island1.y - island2.y)
    if bridge.direction == UP:
      for j in range(1, dist):
        soln[island1.y - j][island1.x] += 1
    elif bridge.direction == DOWN:
      for j in range(1, dist):
        soln[island1.y + j][island1.x] += 1
    elif bridge.direction == LEFT:
      for j in range(1, dist):
        soln[island1.y][island1.x - j] += 1
    elif bridge.direction == RIGHT:
      for j in range(1, dist):
        soln[island1.y][island1.x + j] += 1
  dist = abs(island1.x - island2.x + island1.y - island2.y)
  if dir == UP:
    for j in range(1, dist):
      if soln[island1.y - j][island1.x] > 0:
        return FALSE
  elif dir == DOWN:
    for j in range(1, dist):
      if soln[island1.y + j][island1.x] > 0:
        return FALSE
  elif dir == LEFT:
    for j in range(1, dist):
      if soln[island1.y][island1.x - j] > 0:
        return FALSE
  elif dir == RIGHT:
    for j in range(1, dist):
      if soln[island1.y][island1.x + j] > 0:
        return FALSE
  return TRUE

def add_bridge(p, island, dir):
  island1 = island
  island2 = island.neighbours[dir]
  bridge = constructBridge(p, island1, island2, dir)
  if bridge.wires == 3:
    return
  bridge.wires += 1
  island1.curr_bridges += 1
  island2.curr_bridges += 1
  if bridge.wires == 1:
    bridge.symbol = '-' if bridge.direction == LEFT or bridge.direction == RIGHT else '|'
    p.edges[p.nbridges] = bridge
    p.nbridges += 1
  elif bridge.wires == 2:
    bridge.symbol = '=' if bridge.direction == LEFT or bridge.direction == RIGHT else '"'
  elif bridge.wires == 3:
    bridge.symbol = 'E' if bridge.direction == LEFT or bridge.direction == RIGHT else '#'
  return

def remove_bridge(p, island, dir):
  island1 = island
  island2 = island.neighbours[dir]
  bridge = None
  for i in range(p.nbridges):
    bridge = p.edges[i]
    if ((bridge.island1 == island1 and bridge.island2 == island2) or
        (bridge.island1 == island2 and bridge.island2 == island1)):
      break
  if bridge.wires == 0:
    bridge.skip = True
    return
  bridge.wires -= 1
  island1.curr_bridges -= 1
  island2.curr_bridges -= 1
  if bridge.wires == 1:
    bridge.symbol = '-' if bridge.direction == LEFT or bridge.direction == RIGHT else '|'
  elif bridge.wires == 2:
    bridge.symbol = '=' if bridge.direction == LEFT or bridge.direction == RIGHT else '"'
  else:
    bridge.symbol = ' '
  return

def constructBridge(p, island1, island2, dir):
  for i in range(p.nbridges):
    bridge = p.edges[i]
    if ((bridge.island1 == island1 and bridge.island2 == island2) or
        (bridge.island1 == island2 and bridge.island2 == island1)):
      return bridge
  bridge = Bridge(island1, island2, dir)
  return bridge

def findBridge(p, idx, island):
  for i in range(p.nislands):
    if p.nodes[i] == island:
      ret = i
  if p.nodes[ret].max_bridges == p.nodes[ret].curr_bridges:
    return idx
  else:
    return ret

if __name__ == '__main__':
  sys.exit(main(sys.argv))
