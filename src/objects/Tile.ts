import Phaser from 'phaser';
import { TileFrame } from '../config/AssetConfig';

export class Tile extends Phaser.GameObjects.Sprite {
  public digit: number | 'W' | '+' | '-';
  public gridX: number;
  public gridY: number;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private pauseTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    digit: number | 'W' | '+' | '-',
    gridX: number,
    gridY: number
  ) {
    // Use appropriate spritesheet for animated tiles
    let texture: string;
    if (digit === 'W') {
      texture = 'wildcard-sheet';
    } else if (digit === '+') {
      texture = 'plus-sheet';
    } else if (digit === '-') {
      texture = 'minus-sheet';
    } else {
      texture = `tile-${digit as TileFrame}`;
    }

    super(scene, x, y, texture);
    this.digit = digit;
    this.gridX = gridX;
    this.gridY = gridY;

    scene.add.existing(this);

    // Only wildcards are non-draggable - they can only be merged into
    // Plus and minus tiles are draggable and can merge into number tiles
    const isWildcard = digit === 'W';
    this.setInteractive({ draggable: !isWildcard });
    this.setOrigin(0.5, 0.5);

    // Set up animations
    if (digit === 'W') {
      this.play('wildcard-anim');
    } else if (digit === '+') {
      this.play('plus-anim');
      this.setupPauseOnFrame6();
    } else if (digit === '-') {
      this.play('minus-anim');
      this.setupPauseOnFrame6();
    }

    if (!isWildcard) {
      this.setupDragEvents();
    }
  }

  private setupPauseOnFrame6(): void {
    this.on('animationupdate', (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      // When we reach frame 6, pause for 3 seconds
      if (frame.index === 6 && !this.anims.isPaused) {
        this.anims.pause();

        // Clear any existing timer
        if (this.pauseTimer) {
          this.pauseTimer.destroy();
        }

        // Resume after 3 seconds
        this.pauseTimer = this.scene.time.delayedCall(3000, () => {
          if (this.anims && !this.anims.isPlaying) {
            this.anims.resume();
          }
        });
      }
    });
  }

  private setupDragEvents(): void {
    this.on('dragstart', (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) => {
      this.isDragging = true;
      this.dragStartX = this.x;
      this.dragStartY = this.y;
      const currentScale = this.scale;
      this.setDepth(100);
      this.setScale(currentScale * 1.1);
      this.scene.sound.play('click01');
    });

    this.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.x = dragX;
      this.y = dragY;
    });

    this.on('dragend', () => {
      this.isDragging = false;
      const baseScale = this.scale / 1.1;
      this.setDepth(1);
      this.setScale(baseScale);
      this.scene.sound.play('click02');

      // Emit custom event for grid to handle
      this.emit('drop', this);
    });
  }

  public returnToStart(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.dragStartX,
      y: this.dragStartY,
      duration: 420,
      ease: 'Elastic.easeOut',
      easeParams: [1, 0.4],
    });
  }

  public moveTo(x: number, y: number, gridX: number, gridY: number): void {
    this.gridX = gridX;
    this.gridY = gridY;
    this.dragStartX = x;
    this.dragStartY = y;

    this.scene.tweens.add({
      targets: this,
      x: x,
      y: y,
      duration: 200,
      ease: 'Power2',
    });
  }

  public setDigit(digit: number | 'W' | '+' | '-'): void {
    this.digit = digit;

    // Clean up any existing pause timer
    if (this.pauseTimer) {
      this.pauseTimer.destroy();
      this.pauseTimer = undefined;
    }

    if (digit === 'W') {
      // Switch to wildcard animation
      this.setTexture('wildcard-sheet');
      this.play('wildcard-anim');
    } else if (digit === '+') {
      // Switch to plus animation
      this.setTexture('plus-sheet');
      this.play('plus-anim');
      this.setupPauseOnFrame6();
    } else if (digit === '-') {
      // Switch to minus animation
      this.setTexture('minus-sheet');
      this.play('minus-anim');
      this.setupPauseOnFrame6();
    } else {
      // Switch to static tile texture
      this.stop(); // Stop any animation
      this.setTexture(`tile-${digit as TileFrame}`);
    }
  }

  public isWildcard(): boolean {
    return this.digit === 'W';
  }

  public isPlus(): boolean {
    return this.digit === '+';
  }

  public isMinus(): boolean {
    return this.digit === '-';
  }

  public isNumberTile(): boolean {
    return typeof this.digit === 'number';
  }

  public isBeingDragged(): boolean {
    return this.isDragging;
  }

  public highlightAsLegalTarget(): void {
    if (!this.highlightGraphics) {
      this.highlightGraphics = this.scene.add.graphics();
      this.highlightGraphics.setDepth(0.5);
    }

    this.highlightGraphics.clear();
    // Minimal, subtle highlight - thin gray stroke, scaled to tile size
    const radius = this.displayWidth * 0.48;
    this.highlightGraphics.lineStyle(2, 0x999999, 0.6);
    this.highlightGraphics.strokeCircle(this.x, this.y, radius);
  }

  public clearHighlight(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }
  }

  public destroy(fromScene?: boolean): void {
    this.clearHighlight();
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
    }
    if (this.pauseTimer) {
      this.pauseTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
