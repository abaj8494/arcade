#include <iostream>
#include <cstdint>
#include <vector>
#include <queue>
#include <unordered_set>

// 7x7 Peg Solitaire
static const int N = 7;

// Given (row, col), compute bit index i = 7*row + col
inline int indexRC(int r, int c) {
    return r * N + c;
}

// Check if a jump from i over j to k is valid:
//  - i, j, k must be within valid_mask
//  - occupant has bits i, j set (pegs), and bit k clear (empty)
bool validJump(uint64_t occupant, uint64_t valid_mask, int i, int j, int k) {
    uint64_t bit_i = (1ULL << i);
    uint64_t bit_j = (1ULL << j);
    uint64_t bit_k = (1ULL << k);
    uint64_t mask_ijk = bit_i | bit_j | bit_k;
    
    // Check if all these squares are playable
    if ((mask_ijk & valid_mask) != mask_ijk) {
        return false;
    }
    // i, j occupied, k empty
    if ((occupant & bit_i) == 0)  return false;
    if ((occupant & bit_j) == 0)  return false;
    if ((occupant & bit_k) != 0)  return false;
    
    return true;
}

// Generate all possible next states from the given occupant bitmask
std::vector<uint64_t> getNextStates(uint64_t occupant, uint64_t valid_mask) {
    std::vector<uint64_t> result;
    result.reserve(8); // A rough guess to reduce re-allocations
    
    for (int i = 0; i < N*N; i++) {
        // If there's no peg at i, skip
        if ((occupant & (1ULL << i)) == 0) {
            continue;
        }
        // Convert i into row,col
        int r = i / N;
        int c = i % N;
        
        // UP: i -> i - 2*N
        if (r > 1) {
            int j = i - N;
            int k = i - 2*N;
            if (validJump(occupant, valid_mask, i, j, k)) {
                // Flip bits i, j, k
                uint64_t new_occ = occupant ^ (1ULL << i) ^ (1ULL << j) ^ (1ULL << k);
                result.push_back(new_occ);
            }
        }
        // DOWN: i -> i + 2*N
        if (r < N-2) {
            int j = i + N;
            int k = i + 2*N;
            if (validJump(occupant, valid_mask, i, j, k)) {
                uint64_t new_occ = occupant ^ (1ULL << i) ^ (1ULL << j) ^ (1ULL << k);
                result.push_back(new_occ);
            }
        }
        // LEFT: i -> i - 2
        if (c > 1) {
            int j = i - 1;
            int k = i - 2;
            if (validJump(occupant, valid_mask, i, j, k)) {
                uint64_t new_occ = occupant ^ (1ULL << i) ^ (1ULL << j) ^ (1ULL << k);
                result.push_back(new_occ);
            }
        }
        // RIGHT: i -> i + 2
        if (c < N-2) {
            int j = i + 1;
            int k = i + 2;
            if (validJump(occupant, valid_mask, i, j, k)) {
                uint64_t new_occ = occupant ^ (1ULL << i) ^ (1ULL << j) ^ (1ULL << k);
                result.push_back(new_occ);
            }
        }
    }
    
    return result;
}

int main() {
    // Example board from the Python code
    //  0 => VOID, -1 => EMPTY, >0 => PEG
    int board[7][7] = {
        { 0,  0,  1,  2,  3,  0,  0},
        { 0,  0,  4,  5,  6,  0,  0},
        { 7,  8,  9, 10, 11, 12, 13},
        {14, 15, 16, -1, 17, 18, 19},
        {20, 21, 22, 23, 24, 25, 26},
        { 0,  0, 27, 28, 29,  0,  0},
        { 0,  0, 30, 31, 32,  0,  0}
    };
    
    // Build occupant and valid_mask
    uint64_t occupant = 0ULL;
    uint64_t valid_mask = 0ULL;
    
    for (int r = 0; r < N; r++) {
        for (int c = 0; c < N; c++) {
            int val = board[r][c];
            int idx = indexRC(r, c);
            if (val != 0) { // playable cell
                valid_mask |= (1ULL << idx);
            }
            if (val > 0) { // has a peg
                occupant |= (1ULL << idx);
            }
        }
    }
    
    // We'll do a layered BFS from the initial occupant
    // to find all reachable states and show how many appear at each depth.
    
    std::queue<uint64_t> q;
    std::unordered_set<uint64_t> visited;
    
    q.push(occupant);
    visited.insert(occupant);
    
    int depth = 0;
    
    // We'll store how many unique states at each BFS depth.
    // We won't store them in an array because BFS might go
    // more levels than we expect. We'll just print as we go.
    
    while (!q.empty()) {
        // We'll process the entire 'layer' for this depth
        std::size_t layer_size = q.size();
        int state_count = 0;
        
        for (std::size_t i = 0; i < layer_size; i++) {
            uint64_t current = q.front();
            q.pop();
            state_count++;
            
            // Generate next states
            std::vector<uint64_t> nxt_states = getNextStates(current, valid_mask);
            for (auto &nxt : nxt_states) {
                if (visited.find(nxt) == visited.end()) {
                    visited.insert(nxt);
                    q.push(nxt);
                }
            }
        }
        
        // Now we have processed 'layer_size' states at BFS depth 'depth'
        std::cout << "Depth " << depth << ": "
                  << state_count << " new unique state(s).\n";
        
        depth++;
    }
    
    std::cout << "\nFinished BFS. Explored a total of "
              << visited.size() << " unique states overall.\n";
    
    return 0;
}

