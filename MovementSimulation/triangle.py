import pygame
import sys

# Initialize pygame
pygame.init()

# Screen dimensions
WIDTH, HEIGHT = 800, 600

# Colors
WHITE = (255, 255, 255)
RED = (255, 0, 0)

# Initialize screen
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Move the Triangle")

# Clock for controlling the frame rate
clock = pygame.time.Clock()

# Triangle properties
triangle_size = 30
triangle_pos = [WIDTH // 2, HEIGHT // 2]
triangle_speed = 5

def draw_triangle(screen, position):
    """Draw a triangle at the given position."""
    x, y = position
    points = [
        (x, y - triangle_size),  # Top point
        (x - triangle_size, y + triangle_size),  # Bottom-left point
        (x + triangle_size, y + triangle_size),  # Bottom-right point
    ]
    pygame.draw.polygon(screen, RED, points)

# Main game loop
running = True
while running:
    screen.fill(WHITE)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Key presses
    keys = pygame.key.get_pressed()
    if keys[pygame.K_UP]:
        triangle_pos[1] -= triangle_speed
    if keys[pygame.K_DOWN]:
        triangle_pos[1] += triangle_speed
    if keys[pygame.K_LEFT]:
        triangle_pos[0] -= triangle_speed
    if keys[pygame.K_RIGHT]:
        triangle_pos[0] += triangle_speed

    # Keep triangle within bounds
    triangle_pos[0] = max(triangle_size, min(WIDTH - triangle_size, triangle_pos[0]))
    triangle_pos[1] = max(triangle_size, min(HEIGHT - triangle_size, triangle_pos[1]))

    # Draw triangle
    draw_triangle(screen, triangle_pos)

    # Update the display
    pygame.display.flip()

    # Cap the frame rate
    clock.tick(60)

# Quit pygame
pygame.quit()
sys.exit()
