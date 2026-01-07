#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

#define MAX_ROW 100
#define MAX_COL 100
#define TRUE 1
#define FALSE 0
#define MAX_ISLANDS 400
#define MAX_BRIDGES 400
#define MAX_NEIGHBOURS 200
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
} puzzle, *Puzzle;


int island2num(char ch);
int is_island(char ch);
void scan_map(FILE *fp, char map[MAX_ROW][MAX_COL], Puzzle p);
void parse_map(char map[MAX_ROW][MAX_COL], Puzzle p);
int solve_map(Puzzle p, int idx);
void print_map(Puzzle p);
bool check_solved(Puzzle p);
void add_bridge(Puzzle p, Island i, int dir);
void remove_bridge(Puzzle p, Island i, int dir);
bool can_build_bridge(Puzzle p, Island i, int dir);

int findBridge(Puzzle p, int idx, Island is) {
  int ret;
  for (int i = 0; i < p->nislands; i++) {
    if(p->nodes[i] == is) ret = i;
  }
  if(p->nodes[ret]->max_bridges == p->nodes[ret]->curr_bridges) return idx;
  else return ret;
}

void print_island(Island i) {
  printf("Island id: %p. x: %d. y: %d\n",i,i->x,i->y);
  for (int j = 0; j < i->nneighbours; j++) {
    Island k = i->neighbours[j];
    printf("\tNeighbour: %p. x: %d. y: %d\n",k,k->x,k->y);
  }
  return;
}

Bridge constructBridge(Puzzle p, Island i1, Island i2, int dir) {
  // check if a bridge already exists
  // if so, return it.
  for(int i = 0; i < p->nbridges; i++) {
    Bridge b = p->edges[i];
    if((b->island1 == i1 && b->island2==i2) || (b->island1 == i2 && b->island2 == i1)) {
      return b;
    }
  }

  // otherwise create a fresh bridge
  bridge * b = (bridge*)malloc(sizeof(bridge));
  b->skip = false;
  b->island1 = i1;
  b->island2 = i2;
  b->direction = dir;
  return b;
}

void fake_bridges(Puzzle p) {
  Island i0 = p->nodes[0];
  Island i1 = p->nodes[1];
  Island i2 = p->nodes[2];
  Island i3 = p->nodes[3];
  Island i4 = p->nodes[4];
  Island i5 = p->nodes[5];
  Island i6 = p->nodes[6];
  Island i7 = p->nodes[7];
  Island i8 = p->nodes[8];
  Island i9 = p->nodes[9];
  add_bridge(p,i0,DOWN);
  add_bridge(p,i0,RIGHT);
  add_bridge(p,i0,RIGHT);
  add_bridge(p,i1,DOWN);
  add_bridge(p,i1,DOWN);
  add_bridge(p,i1,DOWN);
  add_bridge(p,i2,DOWN);
  add_bridge(p,i2,DOWN);
  add_bridge(p,i2,DOWN);
  add_bridge(p,i3,DOWN);
  add_bridge(p,i4,DOWN);
  add_bridge(p,i4,DOWN);
  add_bridge(p,i4,RIGHT);
  add_bridge(p,i5,RIGHT);
  add_bridge(p,i5,DOWN);
  add_bridge(p,i5,DOWN);
  add_bridge(p,i7,RIGHT);
  add_bridge(p,i8,RIGHT);
  add_bridge(p,i8,RIGHT);
  add_bridge(p,i8,RIGHT);
  return;
}

int getIsland(Puzzle p, int x, int y) {
  for (int i = 0; i < p->nislands; i++) {
    if(p->nodes[i]->x == x && p->nodes[i]->y == y) return i;
  }
  return -1;
}

int main(int argc, char *argv[]) {
  char map[MAX_ROW][MAX_COL];
  puzzle* p = (puzzle*)malloc(sizeof(puzzle));

  if (argc != 2) {
    printf("Usage: %s <inputfile>\n", argv[0]);
    return 1;
  }

  FILE *fp;
  fp = fopen(argv[1], "r");
  if (fp == NULL) {
    printf("Error reading file %s\n", argv[1]);
    return 1;
  }

  scan_map(fp, map, p);
  parse_map(map, p);
  solve_map(p,0);
  //fake_bridges(p);
  print_map(p);

  return 0;
}

void parse_map(char map[MAX_ROW][MAX_COL], Puzzle p) {
  p->nbridges = 0;
  p->nislands = 0;
  for (int i = 0; i < p->nrows; i++) {
    for (int j = 0; j < p->ncols; j++) {
      if(is_island(map[i][j])) {
        island * iland = (island*)malloc(sizeof(island));
        iland->x = j;
        iland->y = i;
        iland->max_bridges = island2num(map[i][j]);
        iland->nneighbours = 0;
        p->nodes[p->nislands++] = iland; 
      }

    }
  }
  // checks for neighbours in every direction for each island
  // then adds that neighbour island into the neighbour array
  for (int j = 0; j < p->nislands; j++) {
    Island i = p->nodes[j];
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

  while((ch = getc(fp)) != EOF) {
    if (ch == '\n') {
      if (c >= p->ncols) {
        p->ncols = c;
        r++;
      }
      c = 0;
    } else {
      //if (*p_row0 < 0 && is_island(ch)) {
        //*p_row0 = r;
        //*p_col0 = c;
      //}
      map[r][c++] = ch;
    }
  }
  p->nrows = r;
  return;
}

bool check_solved(Puzzle p) {
  Island* start = p->nodes;
  for (int i = 0; i < p->nislands; i++) {
    if(start[i]->curr_bridges == start[i]->max_bridges) continue;
    return false;
  }
  return true;
}

bool can_build_bridge(Puzzle p, Island curr, int dir) {
  Island i1 = curr;
  Island i2 = curr->neighbours[dir];
  if(i2 == NULL){return false;}
  Bridge b;
  for(int i = 0; i < p->nbridges; i++) {
    b = p->edges[i];
    if((b->island1 == i1 && b->island2==i2) || (b->island1 == i2 && b->island2 == i1)) {
      if(b->wires == 3) return false;
      if(b->island2->curr_bridges != b->island2->max_bridges
      && b->island1->curr_bridges != b->island1->max_bridges) return true;
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
    soln[is->y][is->x] = 1;
  }

  for (int i = 0; i < p->nbridges; i++) {
    Bridge b = p->edges[i];
    if(b->skip){continue;}
    Island i1 = b->island1;
    Island i2 = b->island2;
    int dist = abs(i1->x - i2->x + i1->y - i2->y);
    switch(b->direction){
      case UP:
        for(int i = 1; i < dist; i++) {
          soln[i1->y-i][i1->x]++;
        }
        break;
      case DOWN:
        for(int i = 1; i < dist; i++) {
          soln[i1->y+i][i1->x]++;
        }
        break;
      case LEFT:
        for(int i = 1; i < dist; i++) {
          soln[i1->y][i1->x-i]++;
        }
        break;
      case RIGHT:
        for(int i = 1; i < dist; i++) {
          soln[i1->y][i1->x+i]++;
        }
        break;
      default:
        break;
    }
  }
    
  // humour me, print out the soln matrix
  // for (int i = 0; i < p->nrows; i++) {
  //   for (int j = 0; j < p->ncols; j++) {
  //     printf("%d", soln[i][j]);;
  //   }
  //   printf("\n");
  // }
  // printf("\n");

  // final check to see whether any of the cells from the
  // desired bridge are taken

  if(i2->curr_bridges == i2->max_bridges);

  // crossover case
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


  return true;
}

void add_bridge(Puzzle p, Island curr, int dir) {
  Island i1 = curr;
  Island i2 = curr->neighbours[dir];
  Bridge b = constructBridge(p, i1, i2, dir);
  if(b->wires == 3) {return;} // truthfully this should never run. c.f. can_build_bridge
  b->wires++;
  i1->curr_bridges++;
  i2->curr_bridges++;
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


int solve_map(Puzzle p, int idx) { // dfs
  //printf("Island: %d\n", idx);
  //print_map(p);
  //printf("\n");
  if (idx == p->nislands) {                                                 
    return check_solved(p);                                                      
  }                                                                                 
                                                                                    
  Island curr = p->nodes[idx];                                   
  //printf("curr bridges:%d\nmax bridges:%d\n",curr->curr_bridges, curr->max_bridges);
                                                                                    
  // check every direction
  for (int dir = 0; dir < DIRECTIONS; dir++) {                             
    if (can_build_bridge(p, curr, dir)) {                           
      add_bridge(p, curr, dir);                                     
      if (check_solved(p)) {                                         
        return TRUE;                                                                
      }                                                                             
      if(solve_map(p, findBridge(p,idx,curr->neighbours[dir]))) return TRUE;
      remove_bridge(p, curr, dir);                                  
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