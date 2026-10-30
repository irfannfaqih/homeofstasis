import Image from "next/image";
import styles from "./stasis-logo.module.css";

type StasisLogoProps = {
  size?: "small" | "large" | "admin";
  surface?: boolean;
  gradient?: boolean;
  priority?: boolean;
};

export function StasisLogo({ size = "small", surface = false, gradient = false, priority = false }: StasisLogoProps) {
  return (
    <span className={`${styles.frame} ${styles[size]} ${surface ? styles.surface : ""}`}>
      {gradient ? (
        <span className={styles.gradientImage} role="img" aria-label="Stasis" />
      ) : (
        <Image
          className={styles.image}
          src="/stasis-logo-horizontal-v2.png"
          alt="Stasis"
          width={807}
          height={221}
          priority={priority}
        />
      )}
    </span>
  );
}
