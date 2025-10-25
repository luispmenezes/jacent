import Phaser from 'phaser';

export class HowToPlayScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private backButton!: Phaser.GameObjects.Container;
  private nextButton!: Phaser.GameObjects.Container;
  private prevButton!: Phaser.GameObjects.Container;
  private currentSlide: number = 0;
  private slideContainers: Phaser.GameObjects.Container[] = [];
  private slideIndicators: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create(): void {
    this.currentSlide = 0;
    this.slideContainers = [];
    this.slideIndicators = [];

    this.createBackground();
    this.createSlides();
    this.createNavigation();
    this.showSlide(0);

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private createBackground(): void {
    const cam = this.cameras.main;

    this.background = this.add.tileSprite(cam.centerX, cam.centerY, cam.width, cam.height, 'background');
    this.background.setOrigin(0.5);
    this.background.setScrollFactor(0);
    this.background.setDepth(-2);
    this.background.setTint(0xfafafa);
  }

  private createSlides(): void {
    // Slide 1: Introduction
    this.slideContainers.push(this.createIntroSlide());

    // Slide 2: Horizontal merge
    this.slideContainers.push(this.createHorizontalSlide());

    // Slide 3: Diagonal merge
    this.slideContainers.push(this.createDiagonalSlide());

    // Slide 4: Incorrect merge
    this.slideContainers.push(this.createIncorrectSlide());
  }

  private createIntroSlide(): Phaser.GameObjects.Container {
    const cam = this.cameras.main;
    const container = this.add.container(0, 0);
    const primaryColor = '#222222';
    const mutedColor = '#999999';

    const title = this.add.text(cam.centerX, cam.height * 0.25, 'How to Play', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: primaryColor,
    }).setOrigin(0.5);

    const rules = this.add.text(cam.centerX, cam.height * 0.45,
      'Merge adjacent tiles that\ndiffer by exactly 1\n\nGoal: Reduce the grid\nto a single tile', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: mutedColor,
      align: 'center',
      lineSpacing: 12,
    }).setOrigin(0.5);

    container.add([title, rules]);
    return container;
  }

  private createHorizontalSlide(): Phaser.GameObjects.Container {
    const cam = this.cameras.main;
    const container = this.add.container(0, 0);
    const primaryColor = '#222222';

    const title = this.add.text(cam.centerX, cam.height * 0.2, 'Horizontal Merging', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: primaryColor,
    }).setOrigin(0.5);

    const description = this.add.text(cam.centerX, cam.height * 0.32,
      'Tiles next to each other can merge', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#999999',
    }).setOrigin(0.5);

    // Animation tiles
    const tileScale = 2.5;
    const centerX = cam.centerX;
    const centerY = cam.height * 0.55;

    const tile1 = this.add.sprite(centerX - 50, centerY, 'tile-2');
    tile1.setScale(tileScale);

    const tile2 = this.add.sprite(centerX + 50, centerY, 'tile-3');
    tile2.setScale(tileScale);

    const checkMark = this.add.graphics();
    checkMark.lineStyle(5, 0x22aa22);
    checkMark.beginPath();
    checkMark.moveTo(centerX - 15, centerY + 70);
    checkMark.lineTo(centerX - 5, centerY + 80);
    checkMark.lineTo(centerX + 15, centerY + 60);
    checkMark.strokePath();
    checkMark.setAlpha(0);

    container.add([title, description, tile1, tile2, checkMark]);

    // Store animation data
    container.setData('tile1', tile1);
    container.setData('tile2', tile2);
    container.setData('checkMark', checkMark);
    container.setData('animType', 'horizontal');

    return container;
  }

  private createDiagonalSlide(): Phaser.GameObjects.Container {
    const cam = this.cameras.main;
    const container = this.add.container(0, 0);
    const primaryColor = '#222222';

    const title = this.add.text(cam.centerX, cam.height * 0.2, 'Diagonal Merging', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: primaryColor,
    }).setOrigin(0.5);

    const description = this.add.text(cam.centerX, cam.height * 0.32,
      'Tiles can merge in ANY direction', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#999999',
    }).setOrigin(0.5);

    // Animation tiles
    const tileScale = 2.5;
    const centerX = cam.centerX;
    const centerY = cam.height * 0.55;

    const tile1 = this.add.sprite(centerX - 50, centerY - 50, 'tile-4');
    tile1.setScale(tileScale);

    const tile2 = this.add.sprite(centerX + 50, centerY + 50, 'tile-5');
    tile2.setScale(tileScale);

    const checkMark = this.add.graphics();
    checkMark.lineStyle(5, 0x22aa22);
    checkMark.beginPath();
    checkMark.moveTo(centerX + 35, centerY + 50);
    checkMark.lineTo(centerX + 45, centerY + 60);
    checkMark.lineTo(centerX + 65, centerY + 40);
    checkMark.strokePath();
    checkMark.setAlpha(0);

    container.add([title, description, tile1, tile2, checkMark]);

    // Store animation data
    container.setData('tile1', tile1);
    container.setData('tile2', tile2);
    container.setData('checkMark', checkMark);
    container.setData('animType', 'diagonal');

    return container;
  }

  private createIncorrectSlide(): Phaser.GameObjects.Container {
    const cam = this.cameras.main;
    const container = this.add.container(0, 0);
    const primaryColor = '#222222';

    const title = this.add.text(cam.centerX, cam.height * 0.2, 'Invalid Merge', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: primaryColor,
    }).setOrigin(0.5);

    const description = this.add.text(cam.centerX, cam.height * 0.32,
      'Tiles must differ by exactly 1', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#999999',
    }).setOrigin(0.5);

    // Animation tiles
    const tileScale = 2.5;
    const centerX = cam.centerX;
    const centerY = cam.height * 0.55;

    const tile1 = this.add.sprite(centerX - 50, centerY, 'tile-2');
    tile1.setScale(tileScale);

    const tile2 = this.add.sprite(centerX + 50, centerY, 'tile-4');
    tile2.setScale(tileScale);

    const xMark = this.add.graphics();
    xMark.lineStyle(5, 0xcc2222);
    xMark.beginPath();
    xMark.moveTo(centerX - 20, centerY + 60);
    xMark.lineTo(centerX + 20, centerY + 80);
    xMark.moveTo(centerX + 20, centerY + 60);
    xMark.lineTo(centerX - 20, centerY + 80);
    xMark.strokePath();
    xMark.setAlpha(0);

    container.add([title, description, tile1, tile2, xMark]);

    // Store animation data
    container.setData('tile1', tile1);
    container.setData('tile2', tile2);
    container.setData('xMark', xMark);
    container.setData('animType', 'incorrect');

    return container;
  }

  private createNavigation(): void {
    const cam = this.cameras.main;

    // Previous button
    this.prevButton = this.createButton('Previous', () => {
      this.sound.play('click01');
      this.previousSlide();
    });
    this.prevButton.setPosition(cam.width * 0.2, cam.height * 0.85);

    // Next button
    this.nextButton = this.createButton('Next', () => {
      this.sound.play('click01');
      this.nextSlide();
    });
    this.nextButton.setPosition(cam.width * 0.8, cam.height * 0.85);

    // Back button
    this.backButton = this.createButton('Back to Menu', () => {
      this.sound.play('click02');
      this.scene.start('MenuScene');
    });
    this.backButton.setPosition(cam.centerX, cam.height * 0.92);

    // Create slide indicators (dots)
    const indicatorY = cam.height * 0.75;
    const spacing = 20;
    const totalWidth = (this.slideContainers.length - 1) * spacing;
    const startX = cam.centerX - totalWidth / 2;

    for (let i = 0; i < this.slideContainers.length; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(0x999999);
      dot.fillCircle(startX + i * spacing, indicatorY, 5);
      this.slideIndicators.push(dot);
    }
  }

  private showSlide(index: number): void {
    // Hide all slides
    this.slideContainers.forEach((slide) => slide.setVisible(false));

    // Show current slide
    this.slideContainers[index].setVisible(true);

    // Update indicators
    this.slideIndicators.forEach((dot, i) => {
      dot.clear();
      if (i === index) {
        dot.fillStyle(0x222222);
      } else {
        dot.fillStyle(0x999999);
      }
      const cam = this.cameras.main;
      const indicatorY = cam.height * 0.75;
      const spacing = 20;
      const totalWidth = (this.slideContainers.length - 1) * spacing;
      const startX = cam.centerX - totalWidth / 2;
      dot.fillCircle(startX + i * spacing, indicatorY, 5);
    });

    // Update button visibility
    this.prevButton.setVisible(index > 0);
    this.nextButton.setVisible(index < this.slideContainers.length - 1);

    // Start animation for current slide
    this.startSlideAnimation(index);
  }

  private startSlideAnimation(index: number): void {
    const container = this.slideContainers[index];
    const animType = container.getData('animType');

    if (!animType) return; // Intro slide has no animation

    const tile1 = container.getData('tile1');
    const tile2 = container.getData('tile2');
    const checkMark = container.getData('checkMark');
    const xMark = container.getData('xMark');

    const cam = this.cameras.main;
    const centerX = cam.centerX;
    const centerY = cam.height * 0.55;

    if (animType === 'horizontal') {
      this.animateHorizontal(tile1, tile2, checkMark, centerX, centerY);
    } else if (animType === 'diagonal') {
      this.animateDiagonal(tile1, tile2, checkMark, centerX, centerY);
    } else if (animType === 'incorrect') {
      this.animateIncorrect(tile1, tile2, xMark, centerX, centerY);
    }
  }

  private animateHorizontal(tile1: Phaser.GameObjects.Sprite, tile2: Phaser.GameObjects.Sprite, checkMark: Phaser.GameObjects.Graphics, centerX: number, centerY: number): void {
    // Reset
    tile1.setPosition(centerX - 50, centerY);
    tile1.setAlpha(1);
    tile2.setPosition(centerX + 50, centerY);
    tile2.setAlpha(1);
    checkMark.setAlpha(0);

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: tile1,
        x: centerX + 50,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({ targets: tile2, alpha: 0, duration: 200 });
          this.tweens.add({
            targets: checkMark,
            alpha: 1,
            duration: 200,
            onComplete: () => {
              this.time.delayedCall(1000, () => {
                if (this.currentSlide === 1) this.animateHorizontal(tile1, tile2, checkMark, centerX, centerY);
              });
            },
          });
        },
      });
    });
  }

  private animateDiagonal(tile1: Phaser.GameObjects.Sprite, tile2: Phaser.GameObjects.Sprite, checkMark: Phaser.GameObjects.Graphics, centerX: number, centerY: number): void {
    // Reset
    tile1.setPosition(centerX - 50, centerY - 50);
    tile1.setAlpha(1);
    tile2.setPosition(centerX + 50, centerY + 50);
    tile2.setAlpha(1);
    checkMark.setAlpha(0);

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: tile1,
        x: centerX + 50,
        y: centerY + 50,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({ targets: tile2, alpha: 0, duration: 200 });
          this.tweens.add({
            targets: checkMark,
            alpha: 1,
            duration: 200,
            onComplete: () => {
              this.time.delayedCall(1000, () => {
                if (this.currentSlide === 2) this.animateDiagonal(tile1, tile2, checkMark, centerX, centerY);
              });
            },
          });
        },
      });
    });
  }

  private animateIncorrect(tile1: Phaser.GameObjects.Sprite, tile2: Phaser.GameObjects.Sprite, xMark: Phaser.GameObjects.Graphics, centerX: number, centerY: number): void {
    // Reset
    tile1.setPosition(centerX - 50, centerY);
    tile1.setAlpha(1);
    tile2.setPosition(centerX + 50, centerY);
    tile2.setAlpha(1);
    xMark.setAlpha(0);

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: tile1,
        x: centerX - 30,
        duration: 200,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          this.tweens.add({ targets: xMark, alpha: 1, duration: 200 });
          this.tweens.add({
            targets: [tile1, tile2],
            x: '+=5',
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              this.time.delayedCall(1000, () => {
                if (this.currentSlide === 3) this.animateIncorrect(tile1, tile2, xMark, centerX, centerY);
              });
            },
          });
        },
      });
    });
  }

  private nextSlide(): void {
    if (this.currentSlide < this.slideContainers.length - 1) {
      this.currentSlide++;
      this.showSlide(this.currentSlide);
    }
  }

  private previousSlide(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.showSlide(this.currentSlide);
    }
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Container {
    const buttonWidth = 280;
    const buttonHeight = 70;

    const container = this.add.container(0, 0);

    const rect = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xfafafa, 0);
    rect.setStrokeStyle(1, 0xcccccc, 1);
    rect.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#222222',
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0xf0f0f0, 1);
      rect.setStrokeStyle(1, 0x999999, 1);
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0xfafafa, 0);
      rect.setStrokeStyle(1, 0xcccccc, 1);
    });

    rect.on('pointerdown', () => {
      rect.setFillStyle(0xe0e0e0, 1);
      this.sound.play('click01');
    });

    rect.on('pointerup', () => {
      rect.setFillStyle(0xf0f0f0, 1);
      onClick();
    });

    container.add([rect, text]);
    return container;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.cameras.resize(width, height);

    // For simplicity, restart the scene on resize to reposition everything
    this.scene.restart();
  }
}
