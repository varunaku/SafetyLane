import pygame
import sys
import math
import random

pygame.init()

SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 800
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Traffic Cone Simulation with Obstacles")

ORANGE = (255, 165, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)

# Friction coefficient for PLA on concrete
FRICTION_COEFFICIENT = 0.05

# Obstacle and road settings
ROAD_WIDTH = 600
ROAD_Y_START = 100
ROAD_Y_END = 700
OBSTACLE_SIZE = 30
PIT_SIZE = 50
CAR_WIDTH = 80
CAR_HEIGHT = 40

class Cone:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.size = 20
        self.angle = -90  # Starting angle (facing up)
        self.speed_x = 0
        self.speed_y = 0
        self.rotation_speed = 0.0  
        self.move_speed = 2  # How fast the cone moves

    def move(self):
        # Update the position based on speed
        self.x += self.speed_x
        self.y += self.speed_y

    def rotate(self):
        # Apply friction to the rotation speed (only apply to turning, not movement)
        randomness = random.uniform(-0.01, 0.01)  # Small random adjustment to simulate friction's impact on rotation
        self.rotation_speed -= self.rotation_speed * FRICTION_COEFFICIENT  # Apply friction to the rotation speed
        self.angle += self.rotation_speed + randomness

    def draw(self, surface):
        # Define the points of the cone
        points = [
            (self.x - self.size, self.y + self.size),  # Left
            (self.x + self.size, self.y + self.size),  # Right
            (self.x, self.y - self.size)               # Top
        ]
        
        rotated_points = []
        for point in points:
            px, py = point
            rotated_x = self.x + (px - self.x) * math.cos(self.angle) - (py - self.y) * math.sin(self.angle)
            rotated_y = self.y + (px - self.x) * math.sin(self.angle) + (py - self.y) * math.cos(self.angle)
            rotated_points.append((rotated_x, rotated_y))
        
        pygame.draw.polygon(surface, ORANGE, rotated_points)

    def collide_with_rect(self, rect):
        # Simple rectangle collision detection for obstacles
        cone_rect = pygame.Rect(self.x - self.size, self.y - self.size, self.size * 2, self.size * 2)
        return cone_rect.colliderect(rect)


class Obstacle:
    def __init__(self, x, y, width, height, color):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.color = color
        self.rect = pygame.Rect(x, y, width, height)

    def draw(self, surface):
        pygame.draw.rect(surface, self.color, self.rect)


# Create a list of obstacles (pits, cars, blockades)
obstacles = [
    Obstacle(400, 250, PIT_SIZE, PIT_SIZE, RED),  # Pit
    Obstacle(600, 400, PIT_SIZE, PIT_SIZE, RED),  # Pit
    Obstacle(200, 500, CAR_WIDTH, CAR_HEIGHT, GREEN),  # Car
    Obstacle(500, 600, CAR_WIDTH, CAR_HEIGHT, GREEN),  # Car
    Obstacle(700, 300, 30, 100, BLACK)  # Blockade (barrier)
]

# Create the road (simple visual representation)
road = pygame.Rect((SCREEN_WIDTH - ROAD_WIDTH) // 2, ROAD_Y_START, ROAD_WIDTH, ROAD_Y_END - ROAD_Y_START)

# Create the cone
cone = Cone(500, 400)

clock = pygame.time.Clock()
running = True
while running:
    #screen.fill(WHITE)  # Fill the screen with a white background

    # Draw road
    pygame.draw.rect(screen, BLACK, road)

    # Draw obstacles
    for obstacle in obstacles:
        obstacle.draw(screen)

    # Draw cone
    cone.move()  # Move the cone based on its current speed
    cone.draw(screen)

    # Handle user inputs for movement and rotation
    keys = pygame.key.get_pressed()
    cone.speed_x = 0
    cone.speed_y = 0

    if keys[pygame.K_UP]:  # Move the cone forward
        cone.speed_x = math.cos(cone.angle) * cone.move_speed
        cone.speed_y = math.sin(cone.angle) * cone.move_speed
    
    elif keys[pygame.K_DOWN]:  # Move the cone backward
        cone.speed_x = math.cos(cone.angle) * -cone.move_speed
        cone.speed_y = math.sin(cone.angle) * -cone.move_speed
    
    if keys[pygame.K_LEFT]:  # Rotate to the left
        cone.rotation_speed = -0.05
        cone.rotate()
    
    elif keys[pygame.K_RIGHT]:  # Rotate to the right
        cone.rotation_speed = 0.05
        cone.rotate()

    # Collision handling with obstacles (pits, cars, blockades)
    for obstacle in obstacles:
        if cone.collide_with_rect(obstacle.rect):
            if obstacle.color == RED:  # Pit
                cone.speed_x = 0
                cone.speed_y = 0
            elif obstacle.color == GREEN:  # Car
                cone.speed_x = 0
                cone.speed_y = 0  # Stop on car
            elif obstacle.color == BLACK:  # Blockade
                # Simulate a bounce back for blockades
                cone.speed_x = -cone.speed_x * 0.5  # Bounce back with reduced speed
                cone.speed_y = -cone.speed_y * 0.5

    # Collision with road boundaries
    if cone.x < road.x:
        cone.x = road.x
    elif cone.x > road.x + road.width:
        cone.x = road.x + road.width
    if cone.y < road.y:
        cone.y = road.y
    elif cone.y > road.y + road.height:
        cone.y = road.y + road.height

    pygame.display.flip()
    clock.tick(60)  # Run the game loop at 60 frames per second

pygame.quit()
sys.exit()