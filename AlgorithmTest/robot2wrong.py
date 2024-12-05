import numpy as np
import matplotlib.pyplot as plt

# parameters
num_robots = 3  
grid_size = 50
steps = 25

# simulation treats numbers as space in meters
# positions = np.array([[10, 10], [10, 15], [10, 20]])
positions = np.array([[10, 30], [15, 34], [10, 40]]) #first test case 
goal = [10, 40]

def move(positions, grid_size):
    #lets say a robot can move up to 5 meters off the intended course
    #robot has a small change to move 
    movement = np.random.choice([-1, 0,0,0,0, 1], size=3)
    for x in range(0,3):
        if x != 2: positions[x][0] = positions[x][0] + movement[x]
        positions[x][1] += 1
    #stops robots clipping out of bounds in case
    positions = np.clip(positions, 0, grid_size - 1)

# def error_c(positions):
#     #[x coordinate, y coordinate]
#     #[10, 40] 1st robot is correct
#     #[14, 35] 2nd robot is off on the y axis
#     #[10, 30] assume 3rd is correct (it may not be, but it will always be 10m from 1st robot)
#     #1st and 3rd are 10m apart    
    
#     #check 2nd robot against first, first will always be correct since its operator controlled
#     #we use euclidean distance, sqrt(Δx^2+Δy^2) to find our uwb distance
#     #if euclidean distance is > 6 or is < 4 we need to correct bc we know somethings off

#     uwb_distance12 = np.sqrt( np.square(np.abs(positions[2][0] - positions[1][0])) + np.square(np.abs(positions[2][1] - positions[1][1])))
#     # uwb_distance13 = np.sqrt( np.square(np.abs(positions[2][0] - positions[0][0])) + np.square(np.abs(positions[2][1] - positions[0][1])))

    
#     #use triangulation, we know that robot 2 must be 5m from robot 1, and robot 3 must be 10m from robot 3
#     if uwb_distance12 > 6 or uwb_distance12 < 4:
#         #robot 2 is off, correct robot 2
#         dfound_x = 7 #7 is placeholder number since we're using -1,0,1
#         dfound_y = 7
        
#         for i in range(0, 20):
#             if dfound_x == 7:
#                 print("dfound becoming random", dfound_x)
#                 #robot 2 selects random x move, then random y move            
#                 movement = np.random.choice([-1, 0, 1], size=2)                
#                 positions[1][0] = positions[1][0] + movement[0]
#                 positions[1][1] = positions[1][1] + movement[1]
#             else: 
#                 print("dfound continuing", dfound_x)
#                 positions[1][0] = positions[1][0] + dfound_x
#                 positions[1][1] = positions[1][1] + dfound_y

#             #we guessed a direction to move, now we check
#             new_uwb_distance12 = np.sqrt( np.square(np.abs(positions[2][0] - positions[1][0])) + np.square(np.abs(positions[2][1] - positions[1][1])))
#             print("newuwb= ", new_uwb_distance12)
#             print("olduwb= ", uwb_distance12)
#             if np.abs(new_uwb_distance12 - 5) < np.abs(uwb_distance12 - 5):
#                 #new distance is closer, continue moving in that direction
#                 print("FOUND DFOUND at loop: ", i)
#                 dfound_x = movement[0]
#                 dfound_y = movement[1]
#                 uwb_distance12 = new_uwb_distance12
#             else:
#                 #go back, try another direction
#                 positions[1][0] = positions[1][0] - movement[0]
#                 positions[1][1] = positions[1][1] - movement[1]
#                 #UNIMPORTANT NOTE: if we get farther away we can actually improve this algorithm reverse/slightly alter the directions, but its almost 11 and i wanna sleep
#                 print("RESET DFOUND at loop: ", i)
#                 dfound_x = 7
#                 dfound_y = 7
    

    #NOTE: the below may be useful if we need to use angles    
        #check correction is left or right by driving the robot forwards 1-2meters and check if the uwb distance increases or decreases
        #the euclidean distance being close to 6 or 4 will tell us the direction (move to 1st cone or away)
 

    

# Visualization setup
plt.figure(figsize=(8, 8))


dfound_x = 7 #7 is placeholder number since we're using -1,0,1
dfound_y = 7
dfound_x3 = 7
dfound_y3 = 7
        
correctPos2 = False
correctPos3 = False
correctPos23 = False
currentMoves = set()
# Run simulation
for step in range(steps):
    plt.clf()
    # Update positions
    # move(positions, grid_size)
    print(currentMoves)

    uwb_distance12 = np.sqrt( np.square(np.abs(positions[2][0] - positions[1][0])) + np.square(np.abs(positions[2][1] - positions[1][1])))
    uwb_distance23 = np.sqrt( np.square(np.abs(positions[1][0] - positions[0][0])) + np.square(np.abs(positions[1][1] - positions[0][1])))
    uwb_distance13 = np.sqrt( np.square(np.abs(positions[2][0] - positions[0][0])) + np.square(np.abs(positions[2][1] - positions[0][1])))

    if uwb_distance12 < 5.1 and uwb_distance12 > 4.9 and not correctPos2:
        print("CORRECT POS ROBOT 2")
        correctPos2 = True
    if uwb_distance13 < 10.5 and uwb_distance13 > 9.5 and not correctPos3:
        print("CORRECT POS ROBOT 3")
        correctPos3 = True
    if uwb_distance12 < 5.1 and uwb_distance12 > 4.9 and uwb_distance13 < 10.01 and uwb_distance13 > 9.9 and uwb_distance23 < 5.1 and uwb_distance23 > 4.9:
        print("CORRECT POS ROBOT 23")
        correctPos23 = True

    # if uwb_distance12 > 6 or uwb_distance12 < 4: #NOTE removing this condition bc of how the plot works, wil be in real alg
    #robot 2 is off, robot 3 is correct   
    if not correctPos23:
        if dfound_x == 7:
            print("dfound becoming random", dfound_x)
            #robot 2 selects random x move, then random y move 
            movement = np.random.choice([-1, 0, 1], size=2)                
            while tuple(movement) in currentMoves:
                if len(currentMoves) == 9: break
                movement = np.random.choice([-1, 0, 1], size=2)                

            positions[1][0] = positions[1][0] + movement[0]
            positions[1][1] = positions[1][1] + movement[1]
        else: 
            print("dfound continuing", dfound_x, dfound_y)
            positions[1][0] = positions[1][0] + dfound_x
            positions[1][1] = positions[1][1] + dfound_y

        #we guessed a direction to move, now we check
        new_uwb_distance12 = np.sqrt( np.square(np.abs(positions[2][0] - positions[1][0])) + np.square(np.abs(positions[2][1] - positions[1][1])))
        new_uwb_distance23 = np.sqrt( np.square(np.abs(positions[1][0] - positions[0][0])) + np.square(np.abs(positions[1][1] - positions[0][1])))
        print("newuwb 12 | 23", new_uwb_distance12, " | ", new_uwb_distance23)
        if np.abs(new_uwb_distance12 - 5) + np.abs(new_uwb_distance23 - 5) < np.abs(uwb_distance12 - 5) + np.abs(uwb_distance23 - 5):
            #new distance is closer, continue moving in that direction
            dfound_x = movement[0]
            dfound_y = movement[1]
            currentMoves.clear()
            # uwb_distance12 = new_uwb_distance12
        else:
            #go back, try another direction
            plt.scatter(positions[1, 0], positions[1, 1], c='red', label='Robot attempts this movement, then moves back after', marker=6)
            positions[1][0] = positions[1][0] - movement[0]
            positions[1][1] = positions[1][1] - movement[1]
            currentMoves.add((movement[0], movement[1]))
            #UNIMPORTANT NOTE: if we get farther away we can actually improve this algorithm reverse/slightly alter the directions, but its almost 11 and i wanna sleep
            dfound_x = 7
            dfound_y = 7
    
    # #robot 3 is off, correct robot 3
    # if new_uwb_distance12 < 5.1 and new_uwb_distance12 > 4.9:
    #     correctPos2 = True
    # elif np.abs(new_uwb_distance12 - 5) < np.abs(uwb_distance12 - 5):
    #     #new distance is closer, continue moving in that direction
    #     dfound_x = movement[0]
    #     dfound_y = movement[1]
    #     uwb_distance12 = new_uwb_distance12
    # else:
    #     #go back, try another direction
    #     positions[1][0] = positions[1][0] - movement[0]
    #     positions[1][1] = positions[1][1] - movement[1]
    #     #UNIMPORTANT NOTE: if we get farther away we can actually improve this algorithm reverse/slightly alter the directions, but its almost 11 and i wanna sleep
    #     dfound_x = 7
    #     dfound_y = 7
    
 
    # Plot current positions
    plt.scatter(positions[:, 0], positions[:, 1], c='blue', label='Robots', marker=6)
    plt.scatter(goal[0], goal[1], c='red', label='Goal')
    plt.xlim(0, grid_size)
    plt.ylim(0, grid_size)
    plt.title(f"Step {step + 1}")
    plt.xlabel("X Position")
    plt.ylabel("Y Position")
    plt.grid(True)
    plt.legend()
    plt.pause(0.5)  # Pause to simulate animation
print(positions)
plt.show()
