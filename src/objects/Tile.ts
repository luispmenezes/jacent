import Phaser from 'phaser';
import { TileFrame } from '../config/AssetConfig';

export class Tile extends Phaser.GameObjects.Sprite {
  public digit: number;
  public gridX: number;
  public gridY: number;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    digit: number,
    gridX: number,
    gridY: number
  ) {
    super(scene, x, y, `tile-${digit as TileFrame}`);
    this.digit = digit;
    this.gridX = gridX;
    this.gridY = gridY;

    scene.add.existing(this);
    this.setInteractive({ draggable: true });
    this.setOrigin(0.5, 0.5);

    this.setupDragEvents();
  }

  private setupDragEvents(): void {
    this.on('dragstart', (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) => {
      this.isDragging = true;
      this.dragStartX = this.x;
      this.dragStartY = this.y;
      this.setDepth(100);
      this.setScale(1.1);
      this.scene.sound.play('click01');
    });

    this.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.x = dragX;
      this.y = dragY;
    });

    this.on('dragend', () => {
      this.isDragging = false;
      this.setDepth(1);
      this.setScale(1);
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

  public setDigit(digit: number): void {
    this.digit = digit;
    this.setTexture(`tile-${digit as TileFrame}`);
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
    this.highlightGraphics.lineStyle(4, 0x4CAF50, 1);
    this.highlightGraphics.strokeCircle(this.x, this.y, 55);

    // Glow effect
    this.highlightGraphics.lineStyle(8, 0x4CAF50, 0.3);
    this.highlightGraphics.strokeCircle(this.x, this.y, 60);
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
    super.destroy(fromScene);
  }
}
