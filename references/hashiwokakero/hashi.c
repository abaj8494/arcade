#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

#define MAX_ROW 50
#define MAX_COL 50
#define TRUE 1
#define FALSE 0
#define MAX_ISLANDS 1600
#define MAX_BRIDGES 64000
#define UP 0
#define RIGHT 1
#define DOWN 2
#define LEFT 3
#define DIRECTIONS 4

typedef struct island {
  int x, y;
  int max_bridges;
  int curr_bridges;
  struct island * neighbours[DIRECTIONS];
  int nneighbours;
} island, *Island;

typedef struct {
  Island island1;
  Island island2;
  int direction;
  char symbol;
  int wires;
  bool skip;
} bridge, *Bridge;

typedef struct {
  Island nodes[MAX_ISLANDS];
  Bridge edges[MAX_BRIDGES];
  int nrows;
  int ncols;
  int nislands;
  int nbridges;
  int fbridges; // full bridges
  int bbridges; // built bridges
  int solved[MAX_ISLANDS];
  int attempts;
} puzzle, *Puzzle;


int island2num(char ch);
int is_island(char ch);
void scan_map(FILE *fp, char map[MAX_ROW][MAX_COL], Puzzle p);
void parse_map(char map[MAX_ROW][MAX_COL], Puzzle p);
int solve_map(Puzzle p);
void print_map(Puzzle p);
bool check_solved(Puzzle p);
void add_bridge(Puzzle p, Island i, int dir);
void remove_bridge(Puzzle p, Island i, int dir);
bool can_build_bridge(Puzzle p, Island i, int dir);
void heuristics(Puzzle p);
bool forward_check(Puzzle p);

int compareIslands(const void *a, const void *b) {
    Island islandA = *(Island *)a;
    Island islandB = *(Island *)b;

    // Compare based on max_bridges first
    if (islandA->max_bridges != islandB->max_bridges) {
        return islandA->max_bridges - islandB->max_bridges;
    }

    // If max_bridges are equal, compare based on nneighbours
    return islandA->nneighbours - islandB->nneighbours;
}

int findBridge(Puzzle p, Island is)
{
  for (int i = 0; i < p->nislands; i++)
  {
    if (p->nodes[i] == is)
      return i;
  }
  return -1;
}

void print_island(Island i)
{
  printf("Island id: %p. x: %d. y: %d\n", i, i->x, i->y);
  for (int j = 0; j < i->nneighbours; j++)
  {
    Island k = i->neighbours[j];
    printf("\tNeighbour: %p. x: %d. y: %d\n", k, k->x, k->y);
  }
  return;
}

Bridge constructBridge(Puzzle p, Island i1, Island i2, int dir)
{
  // check if a bridge already exists
  // if so, return it.
  for (int i = 0; i < p->nbridges; i++)
  {
    Bridge b = p->edges[i];
    if ((b->island1 == i1 && b->island2 == i2) || (b->island1 == i2 && b->island2 == i1))
    {
      return b;
    }
  }

  // otherwise create a fresh bridge
  bridge *b = (bridge *)malloc(sizeof(bridge));
  b->skip = false;
  b->island1 = i1;
  b->island2 = i2;
  b->direction = dir;
  b->wires = 0;
  return b;
}

int getIsland(Puzzle p, int x, int y)
{
  for (int i = 0; i < p->nislands; i++)
  {
    if (p->nodes[i]->x == x && p->nodes[i]->y == y)
      return i;
  }
  return -1;
}

int main(int argc, char *argv[])
{
  char map[MAX_ROW][MAX_COL] = {{0}};
  puzzle *p = (puzzle *)malloc(sizeof(puzzle));
  scan_map(stdin, map, p);
  parse_map(map, p);
  heuristics(p);
  solve_map(p);
  print_map(p);
  return 0;
}

void parse_map(char map[MAX_ROW][MAX_COL], Puzzle p) {
  p->attempts = 0;
  p->nbridges = 0;
  p->nislands = 0;
  p->fbridges = 0;
  p->bbridges = 0;
  for (int i = 0; i < p->nrows; i++) {
    for (int j = 0; j < p->ncols; j++) {
      if(is_island(map[i][j])) {
        island * iland = (island*)malloc(sizeof(island));
        iland->x = j;
        iland->y = i;
        iland->max_bridges = island2num(map[i][j]);
        p->fbridges += iland->max_bridges;
        iland->nneighbours = 0;
        iland->curr_bridges = 0;
        memset(iland->neighbours, 0, 4*sizeof(struct island *));
        p->nodes[p->nislands++] = iland; 
      }
    }
  }
  // checks for neighbours in every direction for each island
  // then adds that neighbour island into the neighbour array
  for (int j = 0; j < p->nislands; j++) {
    Island i = p->nodes[j];
    p->solved[j] = i->max_bridges-i->curr_bridges;
    // check upwards
    for (int d = 1; d <= i->y; d++) {
      if(i->y==0)break;
      if(is_island(map[i->y-d][i->x])) {
        int idx = getIsland(p, i->x,i->y-d);
        if (idx != -1){
        i->neighbours[UP] = p->nodes[idx];
        i->nneighbours++;
        }
        break;
      }
    }
    // check downwards
    for (int d = 1; i->y + d <= p->nrows; d++) {
      if(i->y==p->nrows)break;
      if(is_island(map[i->y+d][i->x])) {
        int idx = getIsland(p, i->x,i->y+d);
        if (idx != -1){
        i->neighbours[DOWN] = p->nodes[idx];
        i->nneighbours++;
        }
        break;
      }
    }
    // check left
    for (int d = 1; d <= i->x ; d++) {
      if(i->x==0)break;
      if(is_island(map[i->y][i->x-d])) {
        int idx = getIsland(p, i->x-d,i->y);
        if (idx != -1){
        i->neighbours[LEFT] = p->nodes[idx];
        i->nneighbours++;
        }
        break;
      }
    }
    // check right
    for (int d = 1;i->x +d <= p->ncols; d++) {
      if(i->x==p->ncols)break;
      if(is_island(map[i->y][i->x+d])) {
        int idx = getIsland(p, i->x+d,i->y);
        if (idx != -1){
        i->neighbours[RIGHT] = p->nodes[idx];
        i->nneighbours++;
        }
        break;
      }
    }
  }
  p->fbridges /= 2;
}


int is_island(char ch) {
  return(( ch >= '1' && ch <= '9' )||( ch >= 'a' && ch <= 'c' ));
}


int island2num( char ch )
{
  int num;
  if( ch >= 'a' && ch <= 'c' ) {
    num = 10 + ch - 'a';
  }
  else {
    num =  0 + ch - '0';
  }
  return( num );
}

void scan_map(FILE *fp, char map[MAX_ROW][MAX_COL], Puzzle p) {
  int ch;
  int r = 0, c = 0;
  p->ncols = 0, p->nrows = 0;


  while((ch = getc(fp)) != EOF) {
    if (ch == '\n') {
      if (c >= p->ncols) {
        p->ncols = c;
        r++;
      }
      c = 0;
    } else {
      map[r][c++] = ch;
    }
  }
  p->nrows = r;
  return;
}

bool check_solved(Puzzle p) {
  for (int i = 0; i < p->nislands; i++) {
    if(p->solved[i] == 0) continue;
    return false;
  }
  return true;
}



bool can_build_bridge(Puzzle p, Island curr, int dir) {
  Island i1 = curr;
  Island i2 = curr->neighbours[dir];
  bool overlap = false;
  if(i2 == NULL){return false;}
  //forward checking
  if(i1->max_bridges == i1->curr_bridges || i2->max_bridges == i2->curr_bridges) return false;
  Bridge b;
  for(int i = 0; i < p->nbridges; i++) {
    b = p->edges[i];
    if((b->island1 == i1 && b->island2==i2) || (b->island1 == i2 && b->island2 == i1)) {
      if(b->wires == 3) return false;
      //if(i1->curr_bridges != i1->max_bridges && i2->curr_bridges != i2->max_bridges) return true;
      overlap = true;
    }
  }
  // check overlaps with other bridges
  int soln[p->nrows][p->ncols]; // initialise crossover check
  for (int i = 0; i < p->nrows; i++) {
    for (int j = 0; j < p->ncols; j++) {
      soln[i][j] = 0;
    }
  }

  // cells with islands cannot be crossed
  for (int i = 0; i < p->nislands; i++) {
    Island is = p->nodes[i];
    soln[is->y][is->x] = is->max_bridges;
  }

  for (int i = 0; i < p->nbridges; i++) {
    b = p->edges[i];
    if(b->skip){continue;}
    Island i1 = b->island1;
    Island i2 = b->island2;
    int dist = abs(i1->x - i2->x + i1->y - i2->y);
    switch(b->direction){
      case UP:
        for(int i = 1; i < dist; i++) {
          soln[i1->y-i][i1->x] = b->wires;
        }
        break;
      case DOWN:
        for(int i = 1; i < dist; i++) {
          soln[i1->y+i][i1->x] = b->wires;
        }
        break;
      case LEFT:
        for(int i = 1; i < dist; i++) {
          soln[i1->y][i1->x-i] = b->wires;
        }
        break;
      case RIGHT:
        for(int i = 1; i < dist; i++) {
          soln[i1->y][i1->x+i] = b->wires;
        }
        break;
      default:
        break;
    }
  }
    

  if(!overlap) {
    int dist = abs(i1->x - i2->x + i1->y - i2->y);
    switch(dir){
      case UP:
        for(int i = 1; i < dist; i++) {
          if(soln[i1->y-i][i1->x]>0) return false;
        }
        break;
      case DOWN:
        for(int i = 1; i < dist; i++) {
          if(soln[i1->y+i][i1->x]>0) return false;
        }
        break;
      case LEFT:
        for(int i = 1; i < dist; i++) {
          if(soln[i1->y][i1->x-i]>0) return false;
        }
        break;
      case RIGHT:
        for(int i = 1; i < dist; i++) {
          if(soln[i1->y][i1->x+i]>0) return false;
        }
        break;
      default:
        break;
    }
  }
  return true;
}

void add_bridge(Puzzle p, Island curr, int dir) {
  Island i1 = curr;
  Island i2 = curr->neighbours[dir];
  Bridge b = constructBridge(p, i1, i2, dir);
  if(b->wires == 3) {return;} // truthfully this should never run. c.f. can_build_bridge
  b->wires++;
  p->bbridges++;
  i1->curr_bridges++;
  i2->curr_bridges++;
  p->solved[findBridge(p,i1)] = i1->max_bridges - i1->curr_bridges;
  p->solved[findBridge(p,i2)] = i2->max_bridges - i2->curr_bridges;
  switch(b->wires){
    case 1:
      b->symbol = (b->direction == LEFT || b->direction == RIGHT) ? '-' : '|';
      p->edges[p->nbridges++] = b;
      break;
    case 2:
      b->symbol = (b->direction == LEFT || b->direction == RIGHT) ? '=' : '"';
      break;
    case 3:
      b->symbol = (b->direction == LEFT || b->direction == RIGHT) ? 'E' : '#';
      break;
    default:
      b->symbol = ' ';
  }
  return;
}

void remove_bridge(Puzzle p, Island curr, int dir) {
  // go and find said bridge.
  Island i1 = curr;
  Island i2 = curr->neighbours[dir];
  p->solved[findBridge(p,i1)] = i1->max_bridges - i1->curr_bridges;
  p->solved[findBridge(p,i2)] = i2->max_bridges - i2->curr_bridges;
  p->bbridges--;
  Bridge b;
  for(int i = 0; i < p->nbridges; i++) {
    b = p->edges[i];
    if(b->skip){continue;}
    if((b->island1 == i1 && b->island2==i2) || (b->island1 == i2 && b->island2 == i1)) {
      break;
    }
  }
  if(b->wires == 0) { //free the bridge
    b->skip = true;
    return;
  }
  b->wires--;
  i1->curr_bridges--;
  i2->curr_bridges--;
  switch(b->wires){
    case 1:
      b->symbol = (b->direction == LEFT || b->direction == RIGHT) ? '-' : '|';
      break;
    case 2:
      b->symbol = (b->direction == LEFT || b->direction == RIGHT) ? '=' : '"';
      break;
    default:
      b->symbol = ' ';
  }
}

void heuristics(Puzzle p) { //this function is not updating the islands current->bridge count correctly!
  for(int i = 0; i < p->nislands; i++) {
    Island curr = p->nodes[i];
    if(curr->max_bridges >= 10) { // build a bridge in every direction
      for(int dir = 0; dir < DIRECTIONS; dir++) {
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
    }
    if(curr->max_bridges >= 11) { // build a bridge in every direction
      for(int dir = 0; dir < DIRECTIONS; dir++) {
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
    }
    if(curr->max_bridges == 12) { // build a bridge in every direction
      for(int dir = 0; dir < DIRECTIONS; dir++) {
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
    }
    if(curr->nneighbours == 1) {
      int dir = 0;
      while(curr->neighbours[dir] == NULL) dir++;
      for(int b = 0; b < curr->max_bridges; b++) { // add this many bridges
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
    }
    if(curr->nneighbours == 2) {
      if(curr->max_bridges >= 4) {
        int dir = 0;
        while(curr->neighbours[dir] == NULL) dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[dir++] == NULL) dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
      if(curr->max_bridges >= 5) {
        int dir = 0;
        while(curr->neighbours[dir] == NULL) dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[dir++] == NULL) dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
      if(curr->max_bridges >= 6) {
        int dir = 0;
        while(curr->neighbours[dir] == NULL) dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[dir++] == NULL) dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
    }
    if(curr->nneighbours == 3) {
      if(curr->max_bridges >= 7) {
        int dir = 0;
        while(curr->neighbours[dir] == NULL)dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[++dir] == NULL);
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[++dir] == NULL);
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
      if(curr->max_bridges >= 8) {
        int dir = 0;
        while(curr->neighbours[dir] == NULL)dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[++dir] == NULL);
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[++dir] == NULL);
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
      if(curr->max_bridges >= 9) {
        int dir = 0;
        while(curr->neighbours[dir] == NULL)dir++;
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[++dir] == NULL);
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
        while(curr->neighbours[++dir] == NULL);
        if(can_build_bridge(p,curr,dir)) add_bridge(p, curr, dir); 
      }
    }
  }
  //qsort(p->nodes, p->nislands, sizeof(Island), compareIslands);
  //print_map(p);
  for (int i = 0; i < p->nislands; i++) {
    Island curr = p->nodes[i];
    p->solved[i] = curr->max_bridges - curr->curr_bridges;
  }
  // printf("\n");
}

// 
bool should_build_bridge(Puzzle p, Island curr, int dir) {
  add_bridge(p, curr, dir);
  bool ret = true;
  int b1 = 0, b2 = 0;
  int i1 = findBridge(p, curr);
  int i2 = findBridge(p, curr->neighbours[dir]);
  
  for(int i = 0; i < DIRECTIONS; i++) {
    if(can_build_bridge(p, curr,i)) b1++;
    if(can_build_bridge(p, curr->neighbours[dir],i)) b2++;
  }
  if((b1 == 0 && p->solved[i1]) || (b2 == 0 && p->solved[i2])) ret = false;
  remove_bridge(p, curr, dir);
  return ret;
}

void clean_puzzle(Puzzle p) {
  p->attempts = 0;
  for(int i = 0; i < p->nislands; i++) {
    if(p->solved[i] != 0) {
      Island curr = p->nodes[i];
      for(int dir = 0; dir < DIRECTIONS; dir++) {
        if(curr->neighbours[dir] != NULL) remove_bridge(p, curr, dir);
      }
    }
  }
}

int solve_map(Puzzle p) { // backtrack
  if(p->attempts == 2000) clean_puzzle(p);
  print_map(p);
  printf("\n");
  printf("I want %d bridges\nI have %d\n", p->fbridges, p->bbridges);

  p->attempts++;
  printf("\n");
  for (int i = 0; i < p->nislands; i++) {
    printf("%.2d ", p->solved[i]);
  }
  printf("\n");

  if(p->bbridges==p->fbridges) return check_solved(p);

  for(int i = 0; i < p->nislands; i++) {
    Island curr = p->nodes[i];
    p->solved[i] = curr->max_bridges - curr->curr_bridges;
    for(int dir = 0; dir < DIRECTIONS; dir++) {
      if(can_build_bridge(p, curr, dir) && should_build_bridge(p, curr, dir)) {
          add_bridge(p, curr, dir);
          if(solve_map(p)) return TRUE;
          remove_bridge(p, curr, dir);
      }
    }
  }
  return FALSE;
}

void print_map(Puzzle p) {
  char soln[p->nrows][p->ncols];
  for (int i = 0; i < p->nrows; i++) {
    for (int j = 0; j < p->ncols; j++) {
      soln[i][j] = ' ';
    }
  }
  for (int i = 0; i < p->nislands; i++) {
    int max = p->nodes[i]->max_bridges;
    if(max==10) soln[p->nodes[i]->y][p->nodes[i]->x] = 'a';
    else if(max==11) soln[p->nodes[i]->y][p->nodes[i]->x] = 'b';
    else if(max==12) soln[p->nodes[i]->y][p->nodes[i]->x] = 'c';
    else soln[p->nodes[i]->y][p->nodes[i]->x] = '0' + max;
  }
  // for loop to display bridges
  for (int i = 0; i < p->nbridges; i++) {
    Bridge B = p->edges[i];
    if(B->skip){continue;}
    int dist = abs(B->island1->x - B->island2->x + B->island1->y - B->island2->y)-1;
    for (int j = 0; j < dist; ++j) {
      switch(B->direction) {
        case UP:
          soln[B->island1->y-j-1][B->island1->x] = B->symbol;
          break;
        case DOWN:
          soln[B->island1->y+j+1][B->island1->x] = B->symbol;
          break;
        case LEFT:
          soln[B->island1->y][B->island1->x-j-1] = B->symbol;
          break;
        case RIGHT:
          soln[B->island1->y][B->island1->x+j+1] = B->symbol;
          break;
      }
    }
  }

  // nested for loop to print out entire solution
  for (int i = 0; i < p->nrows; i++) {
    for (int j = 0; j < p->ncols; j++) {
      printf("%c", soln[i][j]);
    }
    printf("\n");
  }
}
